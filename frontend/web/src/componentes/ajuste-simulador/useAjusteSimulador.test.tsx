import { act, renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { sugestaoDoisDeTeste } from './apoio-teste';
import { MENSAGEM_FALHA, useAjusteSimulador } from './useAjusteSimulador';

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const { sugestao, entrada, ids } = sugestaoDoisDeTeste();
const japa = ids.get('j-japa')!;
const cabeca = ids.get('j-cabeca')!;
const avaliacao: Record<string, unknown> = { ...sugestao };
delete avaliacao['ordemPrioridade'];

interface Pedido {
  xPelada: string | null;
  corpo: { composicao: { times: { titulares: { id: string }[] }[] } };
}
let pedidos: Pedido[] = [];

function api(resposta: (n: number) => Promise<Response> | Response = () => HttpResponse.json(avaliacao)) {
  pedidos = [];
  servidor.use(
    http.post('/api/grupos/g-quinta/simulador/avaliar', async ({ request }) => {
      pedidos.push({ xPelada: request.headers.get('x-pelada'), corpo: (await request.json()) as Pedido['corpo'] });
      return resposta(pedidos.length);
    }),
  );
}

const montar = () =>
  renderHook(({ s }) => useAjusteSimulador({ grupoId: 'g-quinta', entrada, sugestao: s }), {
    initialProps: { s: sugestao },
  });

describe('useAjusteSimulador', () => {
  it('sem ajuste não consulta a API e Confirmar vale', () => {
    api();
    const { result } = montar();
    expect(result.current.podeConfirmar).toBe(true);
    expect(result.current.houveAjuste).toBe(false);
    expect(pedidos).toHaveLength(0);
  });

  it('três ajustes seguidos viram um pedido com X-Pelada; recalculando bloqueia Confirmar até a resposta', async () => {
    api(async () => {
      await delay(80);
      return HttpResponse.json(avaliacao);
    });
    const { result } = montar();
    act(() => {
      result.current.mover(japa, { lugar: 'titular', time: 1 });
      result.current.mover(cabeca, { lugar: 'naoEntra' });
      result.current.definirSo1oTempo(japa, true);
    });
    expect(result.current.recalculando).toBe(true);
    expect(result.current.podeConfirmar).toBe(false);
    await waitFor(() => expect(pedidos).toHaveLength(1));
    expect(pedidos[0]?.xPelada).toBe('1');
    await waitFor(() => expect(result.current.recalculando).toBe(false));
    expect(result.current.podeConfirmar).toBe(true);
    expect(pedidos).toHaveLength(1);
  });

  it('a posição nova aparece na hora; movidos guarda o jogador', () => {
    api();
    const { result } = montar();
    act(() => result.current.mover(japa, { lugar: 'titular', time: 1 }));
    const exibicao = result.current.exibicao;
    if (exibicao.formato !== 'dois_times') throw new Error('esperava dois times');
    expect(exibicao.times[1].titulares.some((j) => j.id === japa)).toBe(true);
    expect(result.current.movidos.has(japa)).toBe(true);
  });

  it('só a resposta do último pedido é aplicada, mesmo se a anterior chegar depois', async () => {
    const resposta = (nivel: number) =>
      HttpResponse.json({
        ...avaliacao,
        times: sugestao.times.map((t) => ({ ...t, indicadores: { ...t.indicadores, substituicoes: nivel } })),
      });
    api(async (n) => {
      if (n === 1) {
        await delay(150);
        return resposta(1);
      }
      return resposta(7);
    });
    const { result } = montar();
    act(() => result.current.mover(japa, { lugar: 'naoEntra' }));
    await waitFor(() => expect(pedidos).toHaveLength(1), { timeout: 1000 });
    act(() => result.current.mover(cabeca, { lugar: 'naoEntra' }));
    await waitFor(() => expect(pedidos).toHaveLength(2), { timeout: 1000 });
    await waitFor(() => expect(result.current.recalculando).toBe(false), { timeout: 1500 });
    await new Promise((r) => setTimeout(r, 250));
    const exibicao = result.current.exibicao;
    if (exibicao.formato !== 'dois_times') throw new Error('esperava dois times');
    expect(exibicao.times[0].indicadores.substituicoes).toBe(7);
  });

  it('falha mantém a composição, mostra a mensagem e "tentar de novo" reenvia o mesmo corpo', async () => {
    api((n) => (n === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(avaliacao)));
    const { result } = montar();
    act(() => result.current.mover(japa, { lugar: 'titular', time: 1 }));
    await waitFor(() => expect(result.current.erroRecalculo).toBe(MENSAGEM_FALHA));
    expect(result.current.podeConfirmar).toBe(false);
    expect(
      result.current.composicao.formato === 'dois_times' && result.current.composicao.times[1].titulares,
    ).toContain(japa);
    act(() => result.current.tentarDeNovo());
    await waitFor(() => expect(result.current.erroRecalculo).toBeNull());
    expect(pedidos).toHaveLength(2);
    expect(pedidos[1]?.corpo).toEqual(pedidos[0]?.corpo);
    expect(result.current.podeConfirmar).toBe(true);
  });

  it('uma sugestão nova descarta os ajustes e o "movido"', () => {
    api();
    const { result, rerender } = montar();
    act(() => result.current.mover(japa, { lugar: 'titular', time: 1 }));
    expect(result.current.movidos.size).toBe(1);
    rerender({ s: { ...sugestao } });
    expect(result.current.movidos.size).toBe(0);
    expect(result.current.houveAjuste).toBe(false);
    expect(result.current.podeConfirmar).toBe(true);
  });
});
