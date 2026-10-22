import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PeriodosResposta } from '@pelada/contrato';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import type { PeriodoDoJogador } from '../../dados/elenco';
import { DialogoCorrigirDatas } from './DialogoCorrigirDatas';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const BASE = '/api/grupos/g-quinta/jogadores/j-gil';
const HOJE = '2026-10-22';
const GIL = fixture('jogador-gil-periodos.json') as PeriodosResposta;
const [ENTRADA, RETORNO] = GIL.periodos as [PeriodoDoJogador, PeriodoDoJogador];

const INTERMEDIARIO: PeriodoDoJogador = {
  id: 'p-meio',
  tipo: 'retorno',
  inicio: '2026-07-01',
  fim: '2026-08-01',
  corrigivel: { saida: true, retorno: true },
};
const COM_INTERMEDIARIO: PeriodosResposta = {
  periodos: [{ ...ENTRADA, fim: '2026-06-01' }, INTERMEDIARIO, { ...RETORNO, inicio: '2026-09-01' }],
};

interface Chamada {
  metodo: string;
  caminho: string;
  corpo: unknown;
}
let chamadas: Chamada[] = [];

type Resposta = (corpo?: unknown) => Response | Promise<Response>;
interface Opcoes {
  periodos?: PeriodosResposta;
  previa?: Resposta;
  gravar?: Resposta;
}

function api({ periodos = GIL, previa, gravar }: Opcoes = {}) {
  chamadas = [];
  const registrar = async (metodo: string, request: Request) => {
    const corpo = await request.json();
    chamadas.push({ metodo, caminho: new URL(request.url).pathname, corpo });
    return corpo;
  };
  servidor.use(
    http.get(`${BASE}/periodos`, () => HttpResponse.json(periodos)),
    http.post(new RegExp('/periodos/[^/]+/previa$'), async ({ request }) => {
      const corpo = await registrar('POST', request);
      return previa ? previa(corpo) : HttpResponse.json(fixture('periodo-previa-retorno.json'));
    }),
    http.put(new RegExp('/periodos/[^/]+$'), async ({ request }) => {
      await registrar('PUT', request);
      return gravar ? gravar() : HttpResponse.json(fixture('periodo-editar-resposta.json'));
    }),
  );
}

function montar(periodo: PeriodoDoJogador = RETORNO) {
  const aoCancelar = vi.fn();
  const aoCorrigido = vi.fn();
  const aoNaoEncontrado = vi.fn();
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  render(
    <QueryClientProvider client={cliente}>
      <DialogoCorrigirDatas
        grupoId="g-quinta"
        jogadorId="j-gil"
        apelido="Gil"
        hoje={HOJE}
        periodo={periodo}
        aoCancelar={aoCancelar}
        aoCorrigido={aoCorrigido}
        aoNaoEncontrado={aoNaoEncontrado}
      />
    </QueryClientProvider>,
  );
  const dialogo = screen.getByRole('dialog', { name: 'Corrigir datas' });
  const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar novas datas' });
  return { aoCancelar, aoCorrigido, aoNaoEncontrado, dialogo, confirmar };
}

const informar = (campo: HTMLElement, data: string) => fireEvent.change(campo, { target: { value: data } });
const campoDe = (dialogo: HTMLElement, rotulo: string) => within(dialogo).getByLabelText(rotulo);

describe('DialogoCorrigirDatas: abertura', () => {
  it('período de retorno: só a data de retorno, com valor atual, máximo hoje, vizinho na ajuda e foco', async () => {
    api();
    const { dialogo, confirmar } = montar();
    const campo = campoDe(dialogo, 'Data de retorno');
    expect(within(dialogo).queryByLabelText('Data de saída')).toBeNull();
    expect(campo).toHaveValue('2026-10-20');
    expect(campo).toHaveAttribute('max', HOJE);
    expect(campo).toHaveFocus();
    expect(dialogo).toHaveAccessibleDescription('Retorno de Gil: 20/10/2026 até atual.');
    await waitFor(() =>
      expect(campo).toHaveAccessibleDescription(
        'Ele volta a aparecer nas partidas a partir desta data. Não pode ser antes da saída anterior (05/10/2026).',
      ),
    );
    expect(within(dialogo).getByText('Nada a alterar.')).toBeInTheDocument();
    expect(confirmar).toBeDisabled();
    expect(chamadas).toEqual([]);
  });

  it('1º período encerrado: só a saída, com o aviso da entrada e o próximo retorno na ajuda', async () => {
    api();
    const { dialogo } = montar(ENTRADA);
    const campo = campoDe(dialogo, 'Data de saída');
    expect(within(dialogo).queryByLabelText('Data de retorno')).toBeNull();
    expect(campo).toHaveValue('2026-10-05');
    expect(dialogo).toHaveAccessibleDescription(
      'Entrada de Gil: 05/02/2026 até 05/10/2026. A entrada é a data de início da pontuação; para mudá-la, use Alterar data de início.',
    );
    await waitFor(() =>
      expect(campo).toHaveAccessibleDescription(
        'Ele deixa de aparecer nas partidas a partir desta data. Não pode ser depois do próximo retorno (20/10/2026).',
      ),
    );
  });

  it('período intermediário: os dois campos', () => {
    api({ periodos: COM_INTERMEDIARIO });
    const { dialogo } = montar(INTERMEDIARIO);
    expect(campoDe(dialogo, 'Data de saída')).toHaveValue('2026-08-01');
    expect(campoDe(dialogo, 'Data de retorno')).toHaveValue('2026-07-01');
  });

  it('Esc e Cancelar cancelam', async () => {
    api();
    const { aoCancelar, dialogo } = montar();
    await userEvent.keyboard('{Escape}');
    expect(aoCancelar).toHaveBeenCalledTimes(1);
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(aoCancelar).toHaveBeenCalledTimes(2);
  });

  it('o foco fica preso no diálogo', async () => {
    api();
    const { dialogo } = montar();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(dialogo).toContainElement(document.activeElement as HTMLElement);
    await userEvent.tab({ shift: true });
    expect(dialogo).toContainElement(document.activeElement as HTMLElement);
  });
});

describe('DialogoCorrigirDatas: prévia', () => {
  it('retorno antecipado: "Calculando…", depois a prévia e o aviso; Confirmar habilita', async () => {
    api({
      previa: async () => {
        await delay(30);
        return HttpResponse.json(fixture('periodo-previa-retorno.json'));
      },
    });
    const { dialogo, confirmar } = montar();
    informar(campoDe(dialogo, 'Data de retorno'), '2026-10-12');
    expect(await within(dialogo).findByText('Calculando…')).toBeInTheDocument();
    expect(confirmar).toBeDisabled();
    expect(await within(dialogo).findByText('Acumulado de 18 pontos não muda. Posição 15, não muda.')).toBeVisible();
    expect(within(dialogo).getByText('1 rodada passa a constar: 15/10.')).toBeVisible();
    expect(within(dialogo).getByText('Ela vale 0 ponto até você lançar a presença em Editar partida.')).toBeVisible();
    expect(confirmar).toBeEnabled();
    expect(chamadas).toEqual([
      { metodo: 'POST', caminho: `${BASE}/periodos/p-gil-2/previa`, corpo: { retorno: '2026-10-12' } },
    ]);
  });

  it('sentido contrário (adiar): rodada que deixa de constar', async () => {
    api({ previa: () => HttpResponse.json(fixture('periodo-previa-adiar.json')) });
    const { dialogo } = montar();
    informar(campoDe(dialogo, 'Data de retorno'), '2026-10-21');
    expect(await within(dialogo).findByText('1 rodada deixa de constar: 15/10.')).toBeVisible();
  });

  it('saída do 1º período', async () => {
    api({ previa: () => HttpResponse.json(fixture('periodo-previa-saida.json')) });
    const { dialogo, confirmar } = montar(ENTRADA);
    informar(campoDe(dialogo, 'Data de saída'), '2026-10-09');
    expect(await within(dialogo).findByText('1 rodada passa a constar: 08/10.')).toBeVisible();
    expect(confirmar).toBeEnabled();
    expect(chamadas[0]).toMatchObject({ caminho: `${BASE}/periodos/p-gil-1/previa`, corpo: { saida: '2026-10-09' } });
  });

  it('voltar ao valor original limpa a prévia e não chama a API de novo', async () => {
    api();
    const { dialogo, confirmar } = montar();
    const campo = campoDe(dialogo, 'Data de retorno');
    informar(campo, '2026-10-12');
    await within(dialogo).findByText(/Acumulado de 18/);
    informar(campo, '2026-10-20');
    expect(within(dialogo).getByText('Nada a alterar.')).toBeInTheDocument();
    expect(within(dialogo).queryByText(/Acumulado de 18/)).toBeNull();
    expect(confirmar).toBeDisabled();
    expect(chamadas).toHaveLength(1);
  });

  it('resposta atrasada de um valor anterior é descartada', async () => {
    api({
      previa: async (corpo) => {
        if ((corpo as { retorno: string }).retorno === '2026-10-21') {
          await delay(80);
          return HttpResponse.json(fixture('periodo-previa-adiar.json'));
        }
        return HttpResponse.json(fixture('periodo-previa-retorno.json'));
      },
    });
    const { dialogo } = montar();
    const campo = campoDe(dialogo, 'Data de retorno');
    informar(campo, '2026-10-21');
    informar(campo, '2026-10-12');
    await within(dialogo).findByText('1 rodada passa a constar: 15/10.');
    await delay(120);
    expect(within(dialogo).queryByText('1 rodada deixa de constar: 15/10.')).toBeNull();
    expect(within(dialogo).getByText('1 rodada passa a constar: 15/10.')).toBeVisible();
  });

  it('data apagada é recusada na tela, sem chamar a API', async () => {
    api();
    const { dialogo, confirmar } = montar();
    const campo = campoDe(dialogo, 'Data de retorno');
    informar(campo, '');
    expect(await within(dialogo).findByRole('alert')).toBeInTheDocument();
    expect(campo).toBeInvalid();
    expect(confirmar).toBeDisabled();
    expect(chamadas).toEqual([]);
  });
});

describe('DialogoCorrigirDatas: erros', () => {
  it('422 da prévia no campo certo: texto da API, aria-invalid, descrito, foco, nunca como faixa', async () => {
    const resposta = fixture('erro-periodo-presenca.json') as { erro: { campos: { saida: string } } };
    api({ previa: () => HttpResponse.json(resposta, { status: 422 }) });
    const { dialogo, confirmar } = montar(ENTRADA);
    const campo = campoDe(dialogo, 'Data de saída');
    informar(campo, '2026-10-01');
    const alerta = await within(dialogo).findByRole('alert');
    expect(alerta).toHaveTextContent(resposta.erro.campos.saida);
    expect(alerta.className).not.toContain('faixa');
    expect(campo).toBeInvalid();
    expect(campo).toHaveAttribute('aria-describedby', expect.stringContaining(alerta.id));
    expect(campo).toHaveFocus();
    expect(confirmar).toBeDisabled();
    expect(await violacoes(dialogo)).toEqual([]);
  });

  it('falha de rede na prévia: aviso e "Tentar de novo" refaz com o campo preservado', async () => {
    let falhar = true;
    api({ previa: () => (falhar ? HttpResponse.error() : HttpResponse.json(fixture('periodo-previa-retorno.json'))) });
    const { dialogo, confirmar } = montar();
    const campo = campoDe(dialogo, 'Data de retorno');
    informar(campo, '2026-10-12');
    expect(await within(dialogo).findByText('Não foi possível calcular. Verifique a conexão.')).toBeInTheDocument();
    expect(campo).toHaveValue('2026-10-12');
    expect(confirmar).toBeDisabled();
    falhar = false;
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(dialogo).findByText(/Acumulado de 18/)).toBeVisible();
    expect(chamadas).toHaveLength(2);
    expect(campo).toHaveValue('2026-10-12');
  });

  it('404 na prévia avisa quem abriu', async () => {
    api({ previa: () => HttpResponse.json({ erro: { codigo: 'nao_encontrado', mensagem: 'x' } }, { status: 404 }) });
    const { dialogo, aoNaoEncontrado } = montar();
    informar(campoDe(dialogo, 'Data de retorno'), '2026-10-12');
    await waitFor(() => expect(aoNaoEncontrado).toHaveBeenCalledTimes(1));
    expect(within(dialogo).queryByText(/Verifique a conexão/)).toBeNull();
  });
});

describe('DialogoCorrigirDatas: confirmação', () => {
  it('PUT só com os campos corrigíveis e entrega a prévia confirmada', async () => {
    api();
    const { dialogo, confirmar, aoCorrigido } = montar();
    informar(campoDe(dialogo, 'Data de retorno'), '2026-10-12');
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(confirmar);
    await waitFor(() => expect(aoCorrigido).toHaveBeenCalledTimes(1));
    expect(aoCorrigido).toHaveBeenCalledWith(expect.objectContaining({ aviso: expect.stringContaining('0 ponto') }));
    expect(chamadas.map((c) => [c.metodo, c.caminho, c.corpo])).toEqual([
      ['POST', `${BASE}/periodos/p-gil-2/previa`, { retorno: '2026-10-12' }],
      ['PUT', `${BASE}/periodos/p-gil-2`, { retorno: '2026-10-12' }],
    ]);
  });

  it('período intermediário envia os dois campos', async () => {
    api({ periodos: COM_INTERMEDIARIO });
    const { dialogo, confirmar } = montar(INTERMEDIARIO);
    informar(campoDe(dialogo, 'Data de saída'), '2026-08-05');
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(confirmar);
    await waitFor(() => expect(chamadas).toHaveLength(2));
    expect(chamadas[1]?.corpo).toEqual({ saida: '2026-08-05', retorno: '2026-07-01' });
  });

  it('falha de rede ao gravar preserva os campos e "Tentar de novo" grava', async () => {
    let falhar = true;
    api({ gravar: () => (falhar ? HttpResponse.error() : HttpResponse.json(fixture('periodo-editar-resposta.json'))) });
    const { dialogo, confirmar, aoCorrigido } = montar();
    const campo = campoDe(dialogo, 'Data de retorno');
    informar(campo, '2026-10-12');
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(confirmar);
    expect(await within(dialogo).findByText('Não foi possível salvar. Verifique a conexão.')).toBeVisible();
    expect(campo).toHaveValue('2026-10-12');
    expect(aoCorrigido).not.toHaveBeenCalled();
    falhar = false;
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(aoCorrigido).toHaveBeenCalledTimes(1));
  });

  it('422 ao gravar fica no campo', async () => {
    api({ gravar: () => HttpResponse.json(fixture('erro-periodo-presenca.json'), { status: 422 }) });
    const { dialogo, confirmar, aoCorrigido } = montar(ENTRADA);
    informar(campoDe(dialogo, 'Data de saída'), '2026-10-09');
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(confirmar);
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Há presença do jogador em 01/10/2026');
    expect(aoCorrigido).not.toHaveBeenCalled();
  });

  it('404 ao gravar avisa quem abriu', async () => {
    api({ gravar: () => HttpResponse.json({ erro: { codigo: 'nao_encontrado', mensagem: 'x' } }, { status: 404 }) });
    const { dialogo, confirmar, aoNaoEncontrado, aoCorrigido } = montar();
    informar(campoDe(dialogo, 'Data de retorno'), '2026-10-12');
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(confirmar);
    await waitFor(() => expect(aoNaoEncontrado).toHaveBeenCalledTimes(1));
    expect(aoCorrigido).not.toHaveBeenCalled();
  });
});

describe('DialogoCorrigirDatas: acessibilidade', () => {
  it('sem violações do axe: aberto, calculando e com a prévia pronta', async () => {
    api({
      previa: async () => {
        await delay(20);
        return HttpResponse.json(fixture('periodo-previa-retorno.json'));
      },
    });
    const { dialogo } = montar();
    expect(await violacoes(dialogo)).toEqual([]);
    informar(campoDe(dialogo, 'Data de retorno'), '2026-10-12');
    await within(dialogo).findByText('Calculando…');
    expect(await violacoes(dialogo)).toEqual([]);
    await within(dialogo).findByText(/Acumulado de 18/);
    expect(await violacoes(dialogo)).toEqual([]);
  });

  it('sem violações do axe com falha de rede', async () => {
    api({ previa: () => HttpResponse.error() });
    const { dialogo } = montar();
    informar(campoDe(dialogo, 'Data de retorno'), '2026-10-12');
    await within(dialogo).findByText(/Verifique a conexão/);
    expect(await violacoes(dialogo)).toEqual([]);
  });
});
