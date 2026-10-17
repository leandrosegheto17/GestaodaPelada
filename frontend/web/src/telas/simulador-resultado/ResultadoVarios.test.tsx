import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { sugestaoVariosDeTeste } from '../../componentes/ajuste-simulador/apoio-teste';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaResultado } from './PaginaResultado';

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const { sugestao, entrada, ids } = sugestaoVariosDeTeste();

let avaliacoes: unknown[] = [];
let confirmacoes: unknown[] = [];

function api({ avisos, avaliar }: { avisos?: unknown[]; avaliar?: () => Response | Promise<Response> } = {}) {
  avaliacoes = [];
  confirmacoes = [];
  const resposta = { ...sugestao, ...(avisos ? { avisos } : {}) };
  servidor.use(
    http.post('/api/grupos/g-quinta/simulador/sugerir', () => HttpResponse.json(resposta)),
    http.post('/api/grupos/g-quinta/simulador/avaliar', async ({ request }) => {
      avaliacoes.push(await request.json());
      return avaliar?.() ?? HttpResponse.json(resposta);
    }),
    http.post('/api/grupos/g-quinta/escalacoes', async ({ request }) => {
      confirmacoes.push(await request.json());
      return HttpResponse.json({ data: entrada.data, confirmadaEm: '2026-10-20T15:00:00.000Z' }, { status: 201 });
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/simulador/resultado', Component: PaginaResultado },
      { path: '/admin/:grupoId', element: <p>Início</p> },
    ],
    { initialEntries: [{ pathname: '/admin/g-quinta/simulador/resultado', state: { entrada } }] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container, roteador };
}

describe('ResultadoVarios (T14)', () => {
  it('sucesso: contexto, aviso, cinco cartões na ordem e o incompleto com selo e indicadores', async () => {
    api();
    montar();
    expect(await screen.findByRole('heading', { name: 'Times sugeridos' })).toBeInTheDocument();
    expect(screen.getByText('qui, 22/10 · 4 times de 4 + 1 time incompleto de 2')).toBeInTheDocument();
    expect(screen.getByText(/Léo Baiano e Serginho não têm nota/)).toBeInTheDocument();
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos.slice(0, 5)).toEqual(['Time 1', 'Time 2', 'Time 3', 'Time 4', 'Time 5Incompleto (2 de 4)']);
    const ultimo = screen.getByRole('region', { name: /Time 5/ });
    expect(within(ultimo).getByText('13,0')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('o aviso com sugestão de N aparece em role=status', async () => {
    api({
      avisos: [
        {
          tipo: 'incompleto_pequeno',
          texto: 'O time incompleto ficou com 1 jogador, menos da metade de N. Experimente N = 3 ou 2.',
        },
      ],
    });
    montar();
    const aviso = await screen.findByText(/Experimente N = 3 ou 2\./);
    expect(aviso.closest('[role=status]')).not.toBeNull();
  });

  it('D3: "Time 1" atual, "Mover para Time 2…5" e "Trocar com…", sem "Só 1º tempo"', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Toninho/ }));
    const dialogo = await screen.findByRole('dialog', { name: 'Toninho' });
    expect(within(dialogo).getByRole('button', { name: /^Time 1/ })).toHaveAttribute('aria-current', 'true');
    expect(within(dialogo).getAllByRole('button', { name: /^Mover para Time/ })).toHaveLength(4);
    expect(within(dialogo).getByRole('button', { name: 'Trocar com…' })).toBeInTheDocument();
    expect(within(dialogo).queryByRole('switch')).not.toBeInTheDocument();
  });

  it('mover Vini para o Time 2: "movido", recalculando e Confirmar desabilitado até a resposta', async () => {
    api({
      avaliar: async () => {
        await delay(150);
        return HttpResponse.json(sugestao);
      },
    });
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Vini/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Mover para Time 2' }));
    expect(await screen.findByText('movido')).toBeInTheDocument();
    expect(screen.getAllByText('recalculando…').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Confirmar escalação' })).toBeDisabled();
    expect(
      within(screen.getByRole('region', { name: 'Time 2' })).getByRole('button', { name: /Vini/ }),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar escalação' })).toBeEnabled());
    expect(avaliacoes).toHaveLength(1);
  });

  it('confirmar envia a composição de vários times', async () => {
    api();
    const { roteador } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar escalação' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta'));
    expect(confirmacoes[0]).toMatchObject({
      formato: 'varios_times',
      n: 4,
      composicao: { times: expect.arrayContaining([{ jogadores: expect.arrayContaining([ids.get('j-toninho')]) }]) },
    });
    expect(confirmacoes[0]).not.toHaveProperty('k');
  });

  it('refazer com ajuste abre o D2', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: /Vini/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Mover para Time 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Refazer sugestão' }));
    expect(await screen.findByRole('alertdialog', { name: 'Descartar seus ajustes?' })).toBeInTheDocument();
  });

  it('axe: sem violações no resultado e com o D3 aberto', async () => {
    api();
    const { container } = montar();
    await screen.findByRole('heading', { name: 'Times sugeridos' });
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: /Toninho/ }));
    expect(await violacoes(await screen.findByRole('dialog', { name: 'Toninho' }))).toEqual([]);
  });
});
