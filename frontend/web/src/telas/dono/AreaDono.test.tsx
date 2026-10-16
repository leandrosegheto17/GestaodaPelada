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
import { Component as AreaDono } from './AreaDono';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Chamada {
  caminho: string;
  xPelada: string | null;
}
let chamadas: Chamada[] = [];
let leituras = 0;

interface Opcoes {
  painel?: () => Response;
  escrita?: () => Response;
}

function api({ painel = () => HttpResponse.json(fixture('dono-painel.json')), escrita }: Opcoes = {}) {
  chamadas = [];
  leituras = 0;
  servidor.use(
    http.get('/api/dono/painel', () => {
      leituras += 1;
      return painel();
    }),
    http.post('/api/dono/contas/:id/redefinir-senha', ({ request }) => {
      chamadas.push({ caminho: new URL(request.url).pathname, xPelada: request.headers.get('x-pelada') });
      return (
        escrita?.() ??
        HttpResponse.json({ contaId: 'c-marquinhos', nome: 'Marquinhos', senhaTemporaria: 'Tb4kWm9sQr3x' })
      );
    }),
    http.post('/api/dono/pedidos-reset/:id/resolver', ({ request }) => {
      chamadas.push({ caminho: new URL(request.url).pathname, xPelada: request.headers.get('x-pelada') });
      return escrita?.() ?? new HttpResponse(null, { status: 204 });
    }),
  );
}

function montar() {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/dono', Component: AreaDono }], { initialEntries: ['/dono'] });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container, cliente };
}

describe('AreaDono (T26)', () => {
  it('pedidos com contador e meta; grupos com filtro, metadados e links só para a área do dono', async () => {
    api();
    montar();
    expect(await screen.findByRole('heading', { name: 'Pedidos de senha (2)' })).toBeInTheDocument();
    expect(screen.getByText('Pelada de Quinta · último pedido 21/10 09:12')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Ativos (2)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Arquivados (1)' })).toBeInTheDocument();
    const quinta = screen.getByRole('link', { name: /Pelada de Quinta/ });
    expect(quinta).toHaveAttribute('href', '/dono/grupos/g-quinta');
    expect(quinta).toHaveTextContent('Quinta, semanal · 20:00 · Uso próprio');
    expect(quinta).toHaveTextContent('Admins: Leandro, Marquinhos · criado em 05/02/2026');
    expect(screen.getByRole('link', { name: 'Novo grupo' })).toHaveAttribute('href', '/dono/grupos/novo');
    expect(document.querySelector('a[href^="/admin/"]')).toBeNull();
  });

  it('Arquivados mostra só o grupo arquivado, com selo', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('radio', { name: 'Arquivados (1)' }));
    const lista = screen.getAllByRole('list').at(-1)!;
    const itens = within(lista).getAllByRole('listitem');
    expect(itens).toHaveLength(1);
    expect(itens[0]).toHaveTextContent('Futebol da Firma');
    expect(itens[0]).toHaveTextContent('arquivado');
  });

  it('painel vazio: avisos, Novo grupo no aviso e sem barra de ação', async () => {
    api({ painel: () => HttpResponse.json(fixture('dono-painel-vazio.json')) });
    const { container } = montar();
    expect(await screen.findByText('Nenhum pedido pendente.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pedidos de senha' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum grupo criado.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Novo grupo' })).toHaveLength(1);
    expect(await violacoes(container)).toEqual([]);
  });

  it('Redefinir senha abre o D1; fechar apaga a senha do DOM e do cache e refaz o painel', async () => {
    api();
    const { cliente } = montar();
    const [primeiro] = await screen.findAllByRole('button', { name: 'Redefinir senha' });
    await userEvent.click(primeiro!);
    const dialogo = await screen.findByRole('dialog', { name: 'Senha temporária de Marquinhos' });
    expect(dialogo).toHaveTextContent('Tb4kWm9sQr3x');
    expect(chamadas[0]).toEqual({ caminho: '/api/dono/contas/c-marquinhos/redefinir-senha', xPelada: '1' });
    expect(await violacoes(dialogo)).toEqual([]);
    const antes = leituras;
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Já copiei' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body).not.toHaveTextContent('Tb4kWm9sQr3x');
    expect(
      JSON.stringify(
        cliente
          .getMutationCache()
          .getAll()
          .map((m) => m.state.data),
      ),
    ).not.toContain('senhaTemporaria');
    await waitFor(() => expect(leituras).toBeGreaterThan(antes));
  });

  it('Marcar como resolvido envia POST e refaz o painel; falha mostra o erro e mantém a lista', async () => {
    api();
    montar();
    const [primeiro] = await screen.findAllByRole('button', { name: 'Marcar como resolvido' });
    await userEvent.click(primeiro!);
    await waitFor(() =>
      expect(chamadas[0]).toEqual({ caminho: '/api/dono/pedidos-reset/c-marquinhos/resolver', xPelada: '1' }),
    );
  });

  it('erro ao resolver mostra o aviso padrão', async () => {
    api({ escrita: () => HttpResponse.error() });
    montar();
    const [primeiro] = await screen.findAllByRole('button', { name: 'Marcar como resolvido' });
    await userEvent.click(primeiro!);
    expect(await screen.findByText(/Não foi possível concluir/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pedidos de senha (2)' })).toBeInTheDocument();
  });

  it('erro no painel mostra o erro padrão e Tentar de novo refaz o GET', async () => {
    api({ painel: () => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }) });
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar. Verifique a conexão.');
    const antes = leituras;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(leituras).toBeGreaterThan(antes));
  });

  it('sem violações do axe', async () => {
    api();
    const { container } = montar();
    await screen.findByRole('heading', { name: 'Pedidos de senha (2)' });
    expect(await violacoes(container)).toEqual([]);
  });
});
