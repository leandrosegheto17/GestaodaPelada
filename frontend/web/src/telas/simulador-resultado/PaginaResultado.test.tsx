import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { sugestaoDoisDeTeste } from '../../componentes/ajuste-simulador/apoio-teste';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaResultado } from './PaginaResultado';

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const { sugestao, entrada, ids } = sugestaoDoisDeTeste();
const avaliacao: Record<string, unknown> = { ...sugestao };
delete avaliacao['ordemPrioridade'];

interface Opcoes {
  sugerir?: (n: number) => Response | Promise<Response>;
  avaliar?: (n: number) => Response | Promise<Response>;
  confirmar?: () => Response;
}
let sugestoes = 0;
let avaliacoes: unknown[] = [];
let confirmacoes: unknown[] = [];

function api({ sugerir, avaliar, confirmar }: Opcoes = {}) {
  sugestoes = 0;
  avaliacoes = [];
  confirmacoes = [];
  servidor.use(
    http.post('/api/grupos/g-quinta/simulador/sugerir', () => {
      sugestoes += 1;
      return sugerir?.(sugestoes) ?? HttpResponse.json(sugestao);
    }),
    http.post('/api/grupos/g-quinta/simulador/avaliar', async ({ request }) => {
      avaliacoes.push(await request.json());
      return avaliar?.(avaliacoes.length) ?? HttpResponse.json(avaliacao);
    }),
    http.post('/api/grupos/g-quinta/escalacoes', async ({ request }) => {
      confirmacoes.push(await request.json());
      return (
        confirmar?.() ??
        HttpResponse.json({ data: entrada.data, confirmadaEm: '2026-10-20T15:00:00.000Z' }, { status: 201 })
      );
    }),
  );
}

function Estado() {
  const { pathname, state } = useLocation();
  return (
    <div>
      <p>Chegou em {pathname}</p>
      <pre>{JSON.stringify(state)}</pre>
    </div>
  );
}

function montar(comEntrada = true) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/simulador/resultado', Component: PaginaResultado },
      { path: '/admin/:grupoId/simulador', Component: Estado },
      { path: '/admin/:grupoId', Component: Estado },
    ],
    { initialEntries: [{ pathname: '/admin/g-quinta/simulador/resultado', state: comEntrada ? { entrada } : null }] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container, roteador };
}

const confirmar = () => screen.getByRole('button', { name: 'Confirmar escalação' });

describe('PaginaResultado (T13)', () => {
  it('sucesso: contexto, aviso, comparativo, cartões, "Não entra" com a RN-19 e a ordem de prioridade', async () => {
    api();
    montar();
    expect(await screen.findByRole('heading', { name: 'Times sugeridos' })).toBeInTheDocument();
    expect(screen.getByText('qui, 22/10 · 2 times de 7 · até 2 substituições por time')).toBeInTheDocument();
    expect(screen.getByText(/Léo Baiano e Serginho não têm nota/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Comparação entre os times' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Time A' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Time B' })).toBeInTheDocument();
    const naoEntra = screen.getByRole('region', { name: 'Não entra' });
    expect(within(naoEntra).getByRole('button', { name: /Serginho/ })).toBeInTheDocument();
    expect(within(naoEntra).getByText('Compareceram e recebem a pontuação de presença.')).toBeInTheDocument();
    const detalhes = screen.getByText('Ordem de prioridade').closest('details');
    expect(detalhes).not.toHaveAttribute('open');
    expect(within(detalhes!).getAllByRole('listitem')).toHaveLength(19);
    expect(confirmar()).toBeEnabled();
  });

  it('carregando: "Montando os times…" com aria-busy até a resposta', async () => {
    api({
      sugerir: async () => {
        await delay(100);
        return HttpResponse.json(sugestao);
      },
    });
    const { container } = montar();
    expect(await screen.findByRole('heading', { name: 'Montando os times…' })).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(await screen.findByRole('heading', { name: 'Times sugeridos' })).toBeInTheDocument();
  });

  it('sem entrada no state volta às entradas do simulador', async () => {
    api();
    montar(false);
    expect(await screen.findByText('Chegou em /admin/g-quinta/simulador')).toBeInTheDocument();
    expect(sugestoes).toBe(0);
  });

  it('falha ao sugerir volta às entradas com a entrada e a mensagem de erro', async () => {
    api({ sugerir: () => new HttpResponse(null, { status: 500 }) });
    montar();
    expect(await screen.findByText('Chegou em /admin/g-quinta/simulador')).toBeInTheDocument();
    expect(screen.getByText(/Não foi possível sugerir os times/)).toBeInTheDocument();
  });

  it('mover Japa para Titular do Time B: "recalculando…", Confirmar desabilitado e, na resposta, "Indicadores atualizados"', async () => {
    api({
      avaliar: async () => {
        await delay(150);
        return HttpResponse.json(avaliacao);
      },
    });
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Japa/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Titular do Time B' }));
    expect(await screen.findAllByText('recalculando…')).toHaveLength(8);
    expect(confirmar()).toBeDisabled();
    expect(
      within(screen.getByRole('region', { name: 'Time B' })).getByRole('button', { name: /Japa/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Indicadores atualizados')).toBeInTheDocument();
    await waitFor(() => expect(confirmar()).toBeEnabled());
    expect(avaliacoes).toHaveLength(1);
  });

  it('falha ao recalcular: mensagem, "Tentar de novo" e o jogador continua movido', async () => {
    api({ avaliar: (n) => (n === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(avaliacao)) });
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Japa/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Não entra' }));
    expect(await screen.findByText('Não foi possível recalcular.')).toBeInTheDocument();
    expect(confirmar()).toBeDisabled();
    expect(
      within(screen.getByRole('region', { name: 'Não entra' })).getByRole('button', { name: /Japa/ }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(screen.queryByText('Não foi possível recalcular.')).not.toBeInTheDocument());
    expect(avaliacoes).toHaveLength(2);
  });

  it('confirmar envia a composição atual e leva ao início com o recado', async () => {
    api();
    const { roteador } = montar();
    await userEvent.click(await screen.findByRole('button', { name: /Japa/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Não entra' }));
    await waitFor(() => expect(confirmar()).toBeEnabled());
    await userEvent.click(confirmar());
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta'));
    expect(confirmacoes).toHaveLength(1);
    expect(confirmacoes[0]).toMatchObject({
      formato: 'dois_times',
      data: '2026-10-22',
      n: 7,
      composicao: { naoEntra: expect.arrayContaining([ids.get('j-japa'), ids.get('j-serginho')]) },
    });
    expect(roteador.state.location.state).toEqual({ retorno: { tipo: 'escalacao-confirmada', data: '2026-10-22' } });
  });

  it('confirmar com falha mantém a composição e mostra a faixa', async () => {
    api({ confirmar: () => new HttpResponse(null, { status: 500 }) });
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar escalação' }));
    expect(await screen.findByText('Não foi possível confirmar a escalação. Tente de novo.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Time A' })).toBeInTheDocument();
    expect(confirmar()).toBeEnabled();
  });

  it('refazer sem ajuste pede outra sugestão direto', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Refazer sugestão' }));
    await waitFor(() => expect(sugestoes).toBe(2));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('refazer com ajuste abre o D2; Cancelar mantém, Refazer descarta os ajustes e o "movido"', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Japa/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Não entra' }));
    expect(await screen.findAllByText('movido')).not.toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Refazer sugestão' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Descartar seus ajustes?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(sugestoes).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: 'Refazer sugestão' }));
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Refazer sugestão' }),
    );
    await waitFor(() => expect(sugestoes).toBe(2));
    await waitFor(() => expect(screen.queryByText('movido')).not.toBeInTheDocument());
  });

  it('axe: sem violações no resultado e com o D3 aberto', async () => {
    api();
    const { container } = montar();
    await screen.findByRole('heading', { name: 'Times sugeridos' });
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: /Japa/ }));
    await screen.findByRole('dialog', { name: 'Japa' });
    expect(await violacoes(document.body)).toEqual([]);
  });
});
