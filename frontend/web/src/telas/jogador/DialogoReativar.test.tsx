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
import { DialogoReativar } from './DialogoReativar';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const BASE = '/api/grupos/g-quinta/jogadores/j-beto';
const HOJE = '2026-10-22';
const RETRO = '2026-10-07';

interface Chamada {
  metodo: string;
  caminho: string;
  corpo: unknown;
}
let chamadas: Chamada[] = [];

type Resposta = (corpo?: unknown) => Response | Promise<Response>;
function api({ previa, reativar }: { previa?: Resposta; reativar?: Resposta } = {}) {
  chamadas = [];
  const registrar = async (request: Request) => {
    const corpo = await request.json();
    chamadas.push({ metodo: request.method, caminho: new URL(request.url).pathname, corpo });
    return corpo;
  };
  servidor.use(
    http.get(`${BASE}/periodos`, () => HttpResponse.json(fixture('jogador-beto-inativo-periodos.json'))),
    http.post(`${BASE}/reativar/previa`, async ({ request }) => {
      const corpo = await registrar(request);
      return previa ? previa(corpo) : HttpResponse.json(fixture('reativar-previa-beto.json'));
    }),
    http.post(`${BASE}/reativar`, async ({ request }) => {
      const corpo = await registrar(request);
      return reativar ? reativar(corpo) : new HttpResponse(null, { status: 204 });
    }),
  );
}

function montar() {
  const aoCancelar = vi.fn();
  const aoReativado = vi.fn();
  const aoNaoEncontrado = vi.fn();
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <DialogoReativar
        grupoId="g-quinta"
        jogadorId="j-beto"
        apelido="Beto"
        hoje={HOJE}
        aoCancelar={aoCancelar}
        aoReativado={aoReativado}
        aoNaoEncontrado={aoNaoEncontrado}
      />
    </QueryClientProvider>,
  );
  const dialogo = screen.getByRole('dialog', { name: 'Reativar Beto' });
  const reativar = within(dialogo).getByRole('button', { name: 'Reativar' });
  const campo = within(dialogo).getByLabelText('Data de retorno');
  return { aoCancelar, aoReativado, aoNaoEncontrado, dialogo, reativar, campo, container };
}

const informar = (campo: HTMLElement, data: string) => fireEvent.change(campo, { target: { value: data } });

describe('DialogoReativar', () => {
  it('abre com hoje, máximo hoje, foco no campo, saída anterior na ajuda e Reativar habilitado', async () => {
    api();
    const { dialogo, reativar, campo } = montar();
    expect(campo).toHaveValue(HOJE);
    expect(campo).toHaveAttribute('max', HOJE);
    expect(campo).toHaveFocus();
    expect(dialogo).toHaveAccessibleDescription(
      'Volta a aparecer no ranking e nas partidas; a data de início e os pontos não mudam.',
    );
    await waitFor(() =>
      expect(campo).toHaveAccessibleDescription(
        'Pode ser uma data que já passou, se ele voltou a jogar antes de você registrar. Não pode ser antes da saída anterior (05/10/2026).',
      ),
    );
    expect(reativar).toBeEnabled();
  });

  it('hoje: um toque, uma chamada sem prévia, dataRetorno = hoje', async () => {
    api();
    const { reativar, aoReativado } = montar();
    await userEvent.click(reativar);
    await waitFor(() => expect(aoReativado).toHaveBeenCalledWith(HOJE, null));
    expect(chamadas).toEqual([{ metodo: 'POST', caminho: `${BASE}/reativar`, corpo: { dataRetorno: HOJE } }]);
  });

  it('data anterior: calcula a prévia, só então habilita Reativar e confirma com a data', async () => {
    api({
      previa: async () => {
        await delay(30);
        return HttpResponse.json(fixture('reativar-previa-beto.json'));
      },
    });
    const { dialogo, reativar, campo, aoReativado } = montar();
    informar(campo, RETRO);
    expect(await within(dialogo).findByText('Calculando…')).toBeInTheDocument();
    expect(reativar).toBeDisabled();
    expect(await within(dialogo).findByText(/Passa a aparecer no ranking, na posição 15/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/2 rodadas passam a constar: 08\/10 e 15\/10/)).toBeInTheDocument();
    expect(reativar).toBeEnabled();
    await userEvent.click(reativar);
    await waitFor(() => expect(aoReativado).toHaveBeenCalledTimes(1));
    expect(aoReativado.mock.calls[0]?.[0]).toBe(RETRO);
    expect(aoReativado.mock.calls[0]?.[1]).toMatchObject({ posicaoDepois: 15 });
    expect(chamadas.map((c) => [c.caminho, c.corpo])).toEqual([
      [`${BASE}/reativar/previa`, { dataRetorno: RETRO }],
      [`${BASE}/reativar`, { dataRetorno: RETRO }],
    ]);
  });

  it('voltar a hoje limpa a prévia e habilita Reativar sem nova consulta', async () => {
    api();
    const { dialogo, reativar, campo } = montar();
    informar(campo, RETRO);
    await within(dialogo).findByText(/Passa a aparecer no ranking/);
    informar(campo, HOJE);
    expect(within(dialogo).queryByText(/Passa a aparecer no ranking/)).toBeNull();
    expect(reativar).toBeEnabled();
    expect(chamadas).toHaveLength(1);
  });

  it('resposta atrasada de data antiga é descartada', async () => {
    api({
      previa: async (corpo) => {
        if ((corpo as { dataRetorno: string }).dataRetorno === RETRO) {
          await delay(150);
          return HttpResponse.json(fixture('reativar-previa-beto.json'));
        }
        return HttpResponse.json({ ...(fixture('reativar-previa-beto.json') as object), posicaoDepois: 9 });
      },
    });
    const { dialogo, reativar, campo } = montar();
    informar(campo, RETRO);
    informar(campo, '2026-10-08');
    expect(await within(dialogo).findByText(/na posição 9/)).toBeInTheDocument();
    await delay(250);
    expect(within(dialogo).queryByText(/na posição 15/)).toBeNull();
    expect(reativar).toBeEnabled();
  });

  it('data vazia ou no futuro: erro no campo, sem consulta e Reativar desabilitado', async () => {
    api();
    const { dialogo, reativar, campo } = montar();
    informar(campo, '');
    expect(reativar).toBeDisabled();
    informar(campo, '2026-10-23');
    expect(await within(dialogo).findByText('A data não pode ser no futuro.')).toBeInTheDocument();
    expect(reativar).toBeDisabled();
    expect(chamadas).toEqual([]);
  });

  it('422 da prévia aparece no campo com a mensagem da API e devolve o foco a ele', async () => {
    const erro = fixture('erro-reativar-antes-da-saida.json');
    api({ previa: () => HttpResponse.json(erro, { status: 422 }) });
    const { dialogo, reativar, campo } = montar();
    informar(campo, '2026-10-01');
    expect(
      await within(dialogo).findByText('O retorno não pode ser antes da saída anterior (05/10/2026).'),
    ).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveFocus();
    expect(reativar).toBeDisabled();
  });

  it('422 ao reativar aparece no campo e preserva a data', async () => {
    api({ reativar: () => HttpResponse.json(fixture('erro-reativar-antes-da-saida.json'), { status: 422 }) });
    const { dialogo, reativar, campo, aoReativado } = montar();
    await userEvent.click(reativar);
    expect(
      await within(dialogo).findByText('O retorno não pode ser antes da saída anterior (05/10/2026).'),
    ).toBeInTheDocument();
    expect(campo).toHaveValue(HOJE);
    expect(aoReativado).not.toHaveBeenCalled();
  });

  it('rede na prévia: faixa com "Tentar de novo" e campo preservado', async () => {
    let falhar = true;
    api({ previa: () => (falhar ? HttpResponse.error() : HttpResponse.json(fixture('reativar-previa-beto.json'))) });
    const { dialogo, reativar, campo } = montar();
    informar(campo, RETRO);
    expect(await within(dialogo).findByText('Não foi possível calcular. Verifique a conexão.')).toBeInTheDocument();
    expect(campo).toHaveValue(RETRO);
    expect(reativar).toBeDisabled();
    falhar = false;
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tentar de novo' }));
    expect(await within(dialogo).findByText(/Passa a aparecer no ranking/)).toBeInTheDocument();
    expect(reativar).toBeEnabled();
  });

  it('rede ao reativar: faixa com "Tentar de novo" que refaz o POST', async () => {
    let falhar = true;
    api({ reativar: () => (falhar ? HttpResponse.error() : new HttpResponse(null, { status: 204 })) });
    const { dialogo, reativar, campo, aoReativado } = montar();
    await userEvent.click(reativar);
    expect(await within(dialogo).findByText('Não foi possível reativar. Verifique a conexão.')).toBeInTheDocument();
    expect(campo).toHaveValue(HOJE);
    falhar = false;
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(aoReativado).toHaveBeenCalledWith(HOJE, null));
  });

  it('404 ao reativar avisa quem abriu', async () => {
    api({ reativar: () => HttpResponse.json({ erro: { codigo: 'nao_encontrado', mensagem: 'x' } }, { status: 404 }) });
    const { reativar, aoNaoEncontrado, aoReativado } = montar();
    await userEvent.click(reativar);
    await waitFor(() => expect(aoNaoEncontrado).toHaveBeenCalledTimes(1));
    expect(aoReativado).not.toHaveBeenCalled();
  });

  it('Esc e Cancelar cancelam sem chamar a API', async () => {
    api();
    const { aoCancelar } = montar();
    await userEvent.keyboard('{Escape}');
    expect(aoCancelar).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(aoCancelar).toHaveBeenCalledTimes(2);
    expect(chamadas).toEqual([]);
  });

  it('sem violações do axe: aberto e com prévia', async () => {
    api();
    const { dialogo, campo } = montar();
    expect(await violacoes(dialogo)).toEqual([]);
    informar(campo, RETRO);
    await within(dialogo).findByText(/Passa a aparecer no ranking/);
    expect(await violacoes(dialogo)).toEqual([]);
  });
});
