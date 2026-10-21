import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { DialogoInicio } from './DialogoInicio';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const API = '/api/grupos/g-quinta/jogadores/j-toninho/inicio';
const HOJE = '2026-10-22';
const ATUAL = '2026-02-05';

interface Chamada {
  metodo: string;
  caminho: string;
  corpo: unknown;
}
let chamadas: Chamada[] = [];

type Resposta = () => Response | Promise<Response>;
interface Opcoes {
  previa?: Resposta;
  gravar?: Resposta;
}

function api({ previa, gravar }: Opcoes = {}) {
  chamadas = [];
  const registrar = async (metodo: string, request: Request) => {
    chamadas.push({ metodo, caminho: new URL(request.url).pathname, corpo: await request.json() });
  };
  servidor.use(
    http.post(`${API}/previa`, async ({ request }) => {
      await registrar('POST', request);
      return previa ? previa() : HttpResponse.json(fixture('inicio-previa-avancar.json'));
    }),
    http.put(API, async ({ request }) => {
      await registrar('PUT', request);
      return gravar ? gravar() : HttpResponse.json({ inicio: '2026-10-01', alterado: true });
    }),
  );
}

function montar() {
  const aoCancelar = vi.fn();
  const aoAlterado = vi.fn();
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  render(
    <QueryClientProvider client={cliente}>
      <DialogoInicio
        grupoId="g-quinta"
        jogadorId="j-toninho"
        hoje={HOJE}
        atual={ATUAL}
        aoCancelar={aoCancelar}
        aoAlterado={aoAlterado}
      />
    </QueryClientProvider>,
  );
  const dialogo = screen.getByRole('dialog', { name: 'Alterar data de início' });
  const campo = within(dialogo).getByLabelText('Data de início');
  const confirmar = within(dialogo).getByRole('button', { name: 'Confirmar nova data' });
  return { aoCancelar, aoAlterado, dialogo, campo, confirmar };
}

const informar = (campo: HTMLElement, data: string) => fireEvent.change(campo, { target: { value: data } });

describe('DialogoInicio (T16): abertura', () => {
  it('foco no campo, data atual, ajuda, Confirmar desabilitado e "Nada a alterar"', () => {
    api();
    const { campo, confirmar, dialogo } = montar();
    expect(campo).toHaveFocus();
    expect(campo).toHaveValue(ATUAL);
    expect(campo).toHaveAttribute('max', HOJE);
    expect(campo).toHaveAccessibleDescription(
      'A pontuação do jogador conta a partir desta data. Nada é apagado: voltar a data devolve os pontos.',
    );
    expect(confirmar).toBeDisabled();
    expect(within(dialogo).getByText('Nada a alterar.')).toBeInTheDocument();
    expect(chamadas).toEqual([]);
  });

  it('a prévia fica numa região aria-live', () => {
    api();
    const { dialogo } = montar();
    expect(within(dialogo).getByText('Nada a alterar.').closest('[aria-live="polite"]')).not.toBeNull();
  });

  it('Esc cancela e Cancelar também', async () => {
    api();
    const { aoCancelar, dialogo } = montar();
    await userEvent.keyboard('{Escape}');
    expect(aoCancelar).toHaveBeenCalledTimes(1);
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(aoCancelar).toHaveBeenCalledTimes(2);
  });
});

describe('DialogoInicio (T16): prévia', () => {
  it('avançar: mostra "Calculando…" e depois acumulado e posição; Confirmar habilita', async () => {
    api({
      previa: async () => {
        await delay(30);
        return HttpResponse.json(fixture('inicio-previa-avancar.json'));
      },
    });
    const { campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-01');
    expect(await within(dialogo).findByText('Calculando…')).toBeInTheDocument();
    expect(confirmar).toBeDisabled();
    expect(await within(dialogo).findByText('Acumulado de 18 pontos passa a 11; posição de 5 para 7.')).toBeVisible();
    expect(confirmar).toBeEnabled();
    expect(chamadas).toEqual([{ metodo: 'POST', caminho: `${API}/previa`, corpo: { data: '2026-10-01' } }]);
  });

  it('recuar: a mesma linha mais as rodadas que passam a constar', async () => {
    api({ previa: () => HttpResponse.json(fixture('inicio-previa-recuar.json')) });
    const { campo, confirmar, dialogo } = montar();
    informar(campo, '2026-01-15');
    expect(
      await within(dialogo).findByText(
        'Acumulado de 18 pontos passa a 24; posição de 5 para 3. 2 rodadas passam a constar.',
      ),
    ).toBeVisible();
    expect(confirmar).toBeEnabled();
  });

  it('uma rodada usa o singular e jogador fora do ranking não mostra posição', async () => {
    api({
      previa: () =>
        HttpResponse.json({
          acumuladoAntes: 1,
          acumuladoDepois: 4,
          posicaoAntes: null,
          posicaoDepois: null,
          rodadasQuePassamAConstar: 1,
        }),
    });
    const { campo, dialogo } = montar();
    informar(campo, '2026-01-15');
    expect(await within(dialogo).findByText('Acumulado de 1 ponto passa a 4. 1 rodada passa a constar.')).toBeVisible();
  });

  it('voltar à data atual limpa a prévia, não chama a API e desabilita Confirmar', async () => {
    api();
    const { campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-01');
    await within(dialogo).findByText(/Acumulado de 18/);
    informar(campo, ATUAL);
    expect(within(dialogo).getByText('Nada a alterar.')).toBeInTheDocument();
    expect(confirmar).toBeDisabled();
    expect(chamadas).toHaveLength(1);
  });

  it('mudar a data de novo descarta a prévia da data anterior', async () => {
    api({
      previa: async () => {
        await delay(10);
        return HttpResponse.json(fixture('inicio-previa-avancar.json'));
      },
    });
    const { campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-01');
    informar(campo, '2026-10-02');
    await within(dialogo).findByText(/Acumulado de 18/);
    await waitFor(() => expect(confirmar).toBeEnabled());
    informar(campo, '2026-10-03');
    expect(within(dialogo).queryByText(/Acumulado de 18/)).toBeNull();
    expect(confirmar).toBeDisabled();
    await within(dialogo).findByText(/Acumulado de 18/);
  });
});

describe('DialogoInicio (T16): erros', () => {
  it('data futura é recusada na tela com a mensagem do contrato, sem chamar a API', async () => {
    api();
    const { campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-23');
    const alerta = await within(dialogo).findByRole('alert');
    expect(alerta).toHaveTextContent('A data não pode ser no futuro.');
    expect(campo).toBeInvalid();
    expect(confirmar).toBeDisabled();
    expect(chamadas).toEqual([]);
  });

  it('data vazia pede a data e não chama a API', async () => {
    api();
    const { campo, confirmar, dialogo } = montar();
    informar(campo, '');
    expect(await within(dialogo).findByText('Informe a data de início.')).toBeInTheDocument();
    expect(confirmar).toBeDisabled();
    expect(chamadas).toEqual([]);
  });

  it('422 da prévia mostra a mensagem da API no campo', async () => {
    api({ previa: () => HttpResponse.json(fixture('erro-data-futura.json'), { status: 422 }) });
    const { campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-01');
    expect(await within(dialogo).findByText('A data não pode ser no futuro.')).toBeInTheDocument();
    expect(campo).toBeInvalid();
    expect(confirmar).toBeDisabled();
  });

  it('falha de rede na prévia: mensagem e "Tentar de novo" refaz a chamada', async () => {
    let falhar = true;
    api({ previa: () => (falhar ? HttpResponse.error() : HttpResponse.json(fixture('inicio-previa-avancar.json'))) });
    const { campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-01');
    expect(await within(dialogo).findByText('Não foi possível calcular. Verifique a conexão.')).toBeInTheDocument();
    expect(confirmar).toBeDisabled();
    falhar = false;
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(dialogo).findByText(/Acumulado de 18/)).toBeVisible();
    expect(chamadas).toHaveLength(2);
    expect(chamadas[1]?.corpo).toEqual({ data: '2026-10-01' });
    expect(within(dialogo).queryByText(/Não foi possível calcular/)).toBeNull();
  });
});

describe('DialogoInicio (T16): confirmação', () => {
  it('Confirmar envia PUT com a data e avisa quem abriu', async () => {
    api();
    const { aoAlterado, aoCancelar, campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-01');
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(confirmar);
    await waitFor(() => expect(aoAlterado).toHaveBeenCalledTimes(1));
    expect(chamadas.map((c) => [c.metodo, c.caminho, c.corpo])).toEqual([
      ['POST', `${API}/previa`, { data: '2026-10-01' }],
      ['PUT', API, { data: '2026-10-01' }],
    ]);
    expect(aoCancelar).not.toHaveBeenCalled();
  });

  it('falha de rede ao gravar mantém o diálogo aberto e permite tentar de novo', async () => {
    let falhar = true;
    api({
      gravar: () => (falhar ? HttpResponse.error() : HttpResponse.json({ inicio: '2026-10-01', alterado: true })),
    });
    const { aoAlterado, campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-01');
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(confirmar);
    expect(
      await within(dialogo).findByText('Não foi possível alterar. Verifique a conexão e tente de novo.'),
    ).toBeVisible();
    expect(aoAlterado).not.toHaveBeenCalled();
    expect(confirmar).toBeEnabled();
    falhar = false;
    await userEvent.click(confirmar);
    await waitFor(() => expect(aoAlterado).toHaveBeenCalledTimes(1));
  });

  it('422 ao gravar mostra a mensagem da API no campo', async () => {
    api({ gravar: () => HttpResponse.json(fixture('erro-data-futura.json'), { status: 422 }) });
    const { aoAlterado, campo, confirmar, dialogo } = montar();
    informar(campo, '2026-10-01');
    await within(dialogo).findByText(/Acumulado de 18/);
    await userEvent.click(confirmar);
    expect(await within(dialogo).findByText('A data não pode ser no futuro.')).toBeInTheDocument();
    expect(campo).toBeInvalid();
    expect(aoAlterado).not.toHaveBeenCalled();
  });
});

describe('DialogoInicio (T16): acessibilidade', () => {
  it('sem violações do axe: aberto e com a prévia pronta', async () => {
    api();
    const { campo, dialogo } = montar();
    expect(await violacoes(dialogo)).toEqual([]);
    informar(campo, '2026-10-01');
    await within(dialogo).findByText(/Acumulado de 18/);
    expect(await violacoes(dialogo)).toEqual([]);
  });
});
