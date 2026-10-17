import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { recursos } from '../../config/recursos';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as EscolherGrupo } from './EscolherGrupo';

vi.mock('../../config/recursos', () => ({ recursos: { ligado: vi.fn(() => true) } }));

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => vi.mocked(recursos.ligado).mockReturnValue(true));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

function api(sessao: JsonBodyType | 'rede') {
  servidor.use(
    http.get('/api/sessao/eu', () => (sessao === 'rede' ? HttpResponse.error() : HttpResponse.json(sessao))),
  );
}

function montar(rota = '/admin') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { path: '/admin', Component: EscolherGrupo },
      { path: '/admin/:grupoId', element: <p>Início do grupo</p> },
      { path: '/', element: <p>Página inicial</p> },
    ],
    { initialEntries: [rota] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

describe('EscolherGrupo (T08): lista', () => {
  it('cartões com nome, agenda e selo só onde falta o financeiro', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar();
    const lista = await screen.findByRole('list');
    const itens = within(lista).getAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('Pelada de Quinta');
    expect(itens[0]).toHaveTextContent('Toda quinta · 20:00');
    expect(itens[0]).not.toHaveTextContent('Sem acesso ao financeiro');
    expect(itens[1]).toHaveTextContent('Racha de Domingo');
    expect(itens[1]).toHaveTextContent('Domingo, quinzenal · 09:00');
    expect(itens[1]).toHaveTextContent('Sem acesso ao financeiro');
    expect(screen.getByRole('link', { name: /Pelada de Quinta.*Toda quinta/ })).toHaveAttribute(
      'href',
      '/admin/g-quinta',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Seus grupos' })).toBeInTheDocument();
  });

  it('financeiro desligado: sem selo', async () => {
    vi.mocked(recursos.ligado).mockReturnValue(false);
    api(fixture('sessao-eu-admin.json'));
    montar();
    await screen.findByRole('list');
    expect(screen.queryByText('Sem acesso ao financeiro')).toBeNull();
  });

  it('link de grupo alheio mostra o aviso sem o nome do grupo', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar('/admin?grupo=futebol-da-firma');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Você não é admin desse grupo. Escolha um dos seus grupos.',
    );
  });

  it('o menu da conta abre pela barra', async () => {
    api(fixture('sessao-eu-admin.json'));
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Menu da conta' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('sem violações do axe: sucesso e não-admin', async () => {
    api(fixture('sessao-eu-admin.json'));
    const sucesso = montar();
    await screen.findByRole('list');
    expect(await violacoes(sucesso.container)).toEqual([]);
    sucesso.container.remove();
    const naoAdmin = montar('/admin?grupo=futebol-da-firma');
    await screen.findAllByRole('status');
    expect(await violacoes(naoAdmin.container)).toEqual([]);
  });
});

describe('EscolherGrupo (T08): redirecionamento, vazio e erro', () => {
  it('um só grupo: vai direto à tela de início', async () => {
    const sessao = fixture('sessao-eu-admin.json') as { grupos: JsonBodyType[] };
    api({ ...sessao, grupos: sessao.grupos.slice(0, 1) } as JsonBodyType);
    const { roteador } = montar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-quinta'));
  });

  it('?grupo= de um grupo seu vai direto a ele', async () => {
    api(fixture('sessao-eu-admin.json'));
    const { roteador } = montar('/admin?grupo=racha-de-domingo');
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin/g-domingo'));
  });

  it('vazio: sem Menu da conta; Sair envia POST e vai para a página inicial', async () => {
    api(fixture('sessao-eu-sem-grupos.json'));
    let xPelada: string | null = null;
    servidor.use(
      http.post('/api/sessao/sair', ({ request }) => {
        xPelada = request.headers.get('x-pelada');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { roteador, container } = montar();
    expect(await screen.findByRole('heading', { name: 'Nenhum grupo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Menu da conta' })).toBeNull();
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/'));
    expect(xPelada).toBe('1');
  });

  it('falha de rede no GET eu mostra o erro padrão com Tentar de novo', async () => {
    api('rede');
    montar();
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      'Não foi possível carregar. Verifique a conexão.',
    );
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
