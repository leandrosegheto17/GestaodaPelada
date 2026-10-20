import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaJogadores } from './PaginaJogadores';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

let leituras = 0;
function api(resposta: () => Response = () => HttpResponse.json(fixture('jogadores.json'))) {
  leituras = 0;
  servidor.use(
    http.get('/api/grupos/g-quinta/jogadores', () => {
      leituras += 1;
      return resposta();
    }),
  );
}

function montar(rota = '/admin/g-quinta/jogadores') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const [pathname, busca] = rota.split('?');
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/jogadores', Component: PaginaJogadores }], {
    initialEntries: [{ pathname: pathname!, search: busca ? `?${busca}` : '' }],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

/** `jogadores.json` com um inativo em memória. */
function comInativo() {
  const base = fixture('jogadores.json') as { ativos: JsonBodyType[]; inativos: JsonBodyType[] };
  return HttpResponse.json({
    ...base,
    inativos: [
      { id: 'j-zeca', apelido: 'Zeca', posicao: 'atacante', nivel: 5.5, semNota: false, inativoDesde: '2026-08-31' },
    ],
  });
}

describe('PaginaJogadores (T15)', () => {
  it('20 ativos na ordem recebida, com posição, nível, "sem nota" e link', async () => {
    api();
    montar();
    const lista = await screen.findByRole('list');
    const itens = within(lista).getAllByRole('listitem');
    expect(itens).toHaveLength(20);
    expect(itens[0]).toHaveTextContent('Alemão');
    expect(itens[0]).toHaveTextContent('Zagueiro · nível 6,1');
    expect(within(itens[0]!).getByRole('link')).toHaveAttribute('href', '/admin/g-quinta/jogadores/j-alemao');
    const leo = itens.find((li) => li.textContent?.includes('Léo Baiano'))!;
    expect(leo).toHaveTextContent('sem nota');
    expect(leo).not.toHaveTextContent('nível');
    expect(screen.getByRole('link', { name: 'Novo jogador' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/jogadores/novo',
    );
  });

  it('o filtro mostra as contagens e troca a URL para ?filtro=inativos', async () => {
    api(comInativo);
    const { roteador } = montar();
    await screen.findByRole('list');
    expect(screen.getByRole('radio', { name: 'Ativos (20)' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Inativos (1)' }));
    await waitFor(() => expect(roteador.state.location.search).toBe('?filtro=inativos'));
    const item = within(screen.getByRole('list')).getByRole('listitem');
    expect(item).toHaveTextContent('Zeca');
    expect(item).toHaveTextContent('inativo desde 31/08/2026');
  });

  it('busca local sem acento; sem resultado mostra o aviso', async () => {
    api();
    montar();
    await screen.findByRole('list');
    await userEvent.type(screen.getByLabelText('Buscar jogador'), 'leo');
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    await userEvent.clear(screen.getByLabelText('Buscar jogador'));
    await userEvent.type(screen.getByLabelText('Buscar jogador'), 'zzzz');
    expect(await screen.findByText('Nenhum jogador encontrado.')).toBeInTheDocument();
  });

  it('?filtro=inativos vazio: aviso e a barra de Novo jogador mantida', async () => {
    api();
    montar('/admin/g-quinta/jogadores?filtro=inativos');
    expect(await screen.findByText('Nenhum jogador inativo.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo jogador' })).toBeInTheDocument();
  });

  it('sem nenhum ativo: aviso com Novo jogador no próprio aviso, sem barra de ação', async () => {
    api(() => HttpResponse.json(fixture('jogadores-vazio.json')));
    const { container } = montar();
    expect(await screen.findByText('Nenhum jogador cadastrado.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Novo jogador' })).toHaveLength(1);
    expect(screen.queryByLabelText('Buscar jogador')).toBeNull();
    expect(await violacoes(container)).toEqual([]);
  });

  it('503 mostra o erro padrão e Tentar de novo refaz o GET', async () => {
    api(() => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar. Verifique a conexão.');
    const antes = leituras;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(leituras).toBeGreaterThan(antes));
  });

  it('carregando mostra o título e o aviso para leitor de tela', async () => {
    api(() => new Response(null));
    servidor.use(http.get('/api/grupos/g-quinta/jogadores', () => new Promise<Response>(() => undefined)));
    montar();
    expect(await screen.findByRole('status')).toHaveTextContent('Carregando…');
    expect(screen.getByRole('heading', { level: 1, name: 'Jogadores' })).toBeInTheDocument();
  });

  it('sem violações do axe na lista', async () => {
    api();
    const { container } = montar();
    await screen.findByRole('list');
    expect(await violacoes(container)).toEqual([]);
  });
});
