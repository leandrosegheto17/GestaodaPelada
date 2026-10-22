import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaJogador } from './PaginaJogador';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const API = '/api/grupos/g-quinta/jogadores/j-beto';

function api(previa: JsonBodyType = fixture('reativar-previa-beto.json')) {
  let reativado = false;
  servidor.use(
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.get(API, () =>
      HttpResponse.json(
        reativado
          ? { ...(fixture('jogador-beto-inativo.json') as object), situacao: { ativo: true, desde: '2026-10-07' } }
          : fixture('jogador-beto-inativo.json'),
      ),
    ),
    http.get(`${API}/periodos`, () => HttpResponse.json(fixture('jogador-beto-inativo-periodos.json'))),
    http.post(`${API}/reativar/previa`, () => HttpResponse.json(previa)),
    http.post(`${API}/reativar`, () => {
      reativado = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin/:grupoId/jogadores/:jogadorId', Component: PaginaJogador },
      { path: '/admin/:grupoId/partidas', element: <p>Lista de partidas</p> },
    ],
    { initialEntries: ['/admin/g-quinta/jogadores/j-beto'] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

async function reativarEm(data: string) {
  const botao = await screen.findByRole('button', { name: 'Reativar' });
  await userEvent.click(botao);
  const dialogo = await screen.findByRole('dialog', { name: 'Reativar Beto' });
  fireEvent.change(within(dialogo).getByLabelText('Data de retorno'), { target: { value: data } });
  if (data !== '2026-10-22') await within(dialogo).findByText(/Passa a aparecer no ranking/);
  await userEvent.click(within(dialogo).getByRole('button', { name: 'Reativar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
}

describe('Reativar na ficha', () => {
  it('retorno retroativo: faixa de sucesso, faixa de atenção persistente e ficha ativa', async () => {
    api();
    const { roteador, container } = montar();
    await reativarEm('2026-10-07');
    expect(screen.getByText('Beto reativado desde 07/10/2026.').closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText(/2 rodadas passaram a constar: 08\/10 e 15\/10\. Elas valem 0 ponto/)).toBeVisible();
    expect(await screen.findByText('Ativo desde 07/10/2026.')).toBeVisible();
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('link', { name: 'Abrir partidas' }));
    expect(roteador.state.location.pathname).toBe('/admin/g-quinta/partidas');
  });

  it('retorno hoje: só a faixa de sucesso, sem atenção', async () => {
    api();
    montar();
    await reativarEm('2026-10-22');
    expect(screen.getByText('Beto reativado desde 22/10/2026.').closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Abrir partidas' })).toBeNull();
  });

  it('prévia sem rodadas a constar: sem faixa de atenção', async () => {
    api({
      ...(fixture('reativar-previa-beto.json') as object),
      rodadasQuePassamAConstar: [],
      aviso: null,
    });
    montar();
    await reativarEm('2026-10-07');
    expect(screen.getByText('Beto reativado desde 07/10/2026.').closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Abrir partidas' })).toBeNull();
  });

  it('Esc cancela, devolve o foco ao botão Reativar e não deixa faixa', async () => {
    api();
    montar();
    const botao = await screen.findByRole('button', { name: 'Reativar' });
    await userEvent.click(botao);
    await screen.findByRole('dialog', { name: 'Reativar Beto' });
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(botao).toHaveFocus();
    expect(screen.queryByText(/reativado desde/)).toBeNull();
  });
});
