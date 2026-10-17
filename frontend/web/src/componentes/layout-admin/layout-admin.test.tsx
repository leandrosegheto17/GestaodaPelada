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
import { LayoutAdmin } from './index';

vi.mock('../../config/recursos', () => ({ recursos: { ligado: vi.fn(() => true) } }));

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
interface Dado {
  grupos: unknown[];
  enderecoNovo?: string | null;
  [campo: string]: unknown;
}
const lerArquivo = (nome: string): unknown => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8'));
const fixture = (nome: string): JsonBodyType => lerArquivo(nome) as JsonBodyType;
const dado = (nome: string): Dado => lerArquivo(nome) as Dado;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => vi.mocked(recursos.ligado).mockReturnValue(true));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

function responder(sessao: JsonBodyType, grupo: JsonBodyType | 404 = fixture('grupo-quinta.json')) {
  servidor.use(
    http.get('/api/sessao/eu', () => HttpResponse.json(sessao)),
    http.get('/api/grupos/g-quinta', () =>
      grupo === 404
        ? HttpResponse.json(fixture('erro-nao-encontrado.json'), { status: 404 })
        : HttpResponse.json(grupo),
    ),
  );
}

function montar(semAtalhos = false) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      {
        path: '/admin/:grupoId',
        element: <LayoutAdmin />,
        children: [{ index: true, handle: { atalhos: !semAtalhos }, element: <p>Início do admin</p> }],
      },
      { path: '/admin', element: <p>Lista de grupos</p> },
      { path: '/conta/senha', element: <p>Minha senha</p> },
      { path: '/', element: <p>Página inicial</p> },
    ],
    { initialEntries: ['/admin/g-quinta'] },
  );
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, cliente, container };
}

describe('LayoutAdmin', () => {
  it('barra com o nome do grupo, Trocar grupo com 2 grupos e Ver ranking relativo', async () => {
    responder(fixture('sessao-eu-admin.json'));
    montar();
    expect(await screen.findByText('Pelada de Quinta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trocar grupo' })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Ver ranking' })).toHaveAttribute('href', '/g/pelada-de-quinta');
    expect(screen.getByText('Início do admin')).toBeInTheDocument();
  });

  it('rota sem handle de atalhos: barra só com nome e Trocar grupo', async () => {
    responder(fixture('sessao-eu-admin.json'));
    montar(true);
    expect(await screen.findByText('Pelada de Quinta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trocar grupo' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver ranking' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Menu da conta' })).not.toBeInTheDocument();
  });

  it('com um só grupo, não há Trocar grupo', async () => {
    const sessao = dado('sessao-eu-admin.json');
    responder({ ...sessao, grupos: sessao.grupos.slice(0, 1) } as JsonBodyType);
    montar();
    await screen.findByText('Pelada de Quinta');
    expect(screen.queryByRole('link', { name: 'Trocar grupo' })).toBeNull();
  });

  it('menu da conta: abre, dono vê Área do dono, Esc fecha e devolve o foco', async () => {
    responder(fixture('sessao-eu-admin.json'));
    montar();
    await screen.findByText('Pelada de Quinta');
    const abrir = screen.getByRole('button', { name: 'Menu da conta' });
    await userEvent.click(abrir);
    const folha = screen.getByRole('dialog', { name: 'Leandro' });
    expect(within(folha).getByRole('link', { name: 'Minha senha' })).toBeInTheDocument();
    expect(within(folha).getByRole('link', { name: 'Privacidade' })).toBeInTheDocument();
    expect(within(folha).getByRole('link', { name: 'Área do dono' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(abrir).toHaveFocus();
  });

  it('quem não é dono não vê Área do dono; recurso desligado esconde Privacidade', async () => {
    vi.mocked(recursos.ligado).mockReturnValue(false);
    responder(fixture('sessao-eu-carlos.json'));
    montar();
    await screen.findByText('Pelada de Quinta');
    await userEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    const folha = screen.getByRole('dialog');
    expect(within(folha).queryByRole('link', { name: 'Área do dono' })).toBeNull();
    expect(within(folha).queryByRole('link', { name: 'Privacidade' })).toBeNull();
  });

  it('navegar por uma opção fecha o menu', async () => {
    responder(fixture('sessao-eu-admin.json'));
    const { roteador } = montar();
    await screen.findByText('Pelada de Quinta');
    await userEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    await userEvent.click(screen.getByRole('link', { name: 'Minha senha' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/conta/senha'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Sair envia POST com X-Pelada, esvazia o cache e vai para a página inicial', async () => {
    responder(fixture('sessao-eu-admin.json'));
    let cabecalho: string | null = null;
    servidor.use(
      http.post('/api/sessao/sair', ({ request }) => {
        cabecalho = request.headers.get('x-pelada');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { roteador, cliente } = montar();
    await screen.findByText('Pelada de Quinta');
    await userEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/'));
    expect(cabecalho).toBe('1');
    expect(cliente.getQueryCache().getAll()).toHaveLength(0);
  });

  it('falha de rede ao sair mostra a mensagem e continua na página', async () => {
    responder(fixture('sessao-eu-admin.json'));
    servidor.use(http.post('/api/sessao/sair', () => HttpResponse.error()));
    const { roteador } = montar();
    await screen.findByText('Pelada de Quinta');
    await userEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByText('Não foi possível sair. Tente de novo.')).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe('/admin/g-quinta');
  });

  it('endereço novo mostra a faixa com a mesma rota; nulo não mostra nada', async () => {
    const novo = dado('sessao-eu-endereco-novo.json').enderecoNovo as string;
    responder({ ...dado('sessao-eu-admin.json'), enderecoNovo: novo } as JsonBodyType);
    const primeira = montar();
    await screen.findByText('Pelada de Quinta');
    expect(screen.getByRole('link', { name: 'Abrir o novo endereço e reinstalar' })).toHaveAttribute(
      'href',
      new URL('/admin/g-quinta', novo).href,
    );
    primeira.container.remove();
  });

  it('sem endereço novo, não há faixa', async () => {
    responder(fixture('sessao-eu-admin.json'));
    montar();
    await screen.findByText('Pelada de Quinta');
    expect(screen.queryByText('O app mudou de endereço.')).toBeNull();
  });

  it('grupo 404 volta para /admin', async () => {
    responder(fixture('sessao-eu-admin.json'), 404);
    const { roteador } = montar();
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/admin'));
  });

  it('sem violações do axe, com o menu fechado e aberto', async () => {
    responder(fixture('sessao-eu-admin.json'));
    const { container } = montar();
    await screen.findByText('Pelada de Quinta');
    expect(await violacoes(container)).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    expect(await violacoes(screen.getByRole('dialog'))).toEqual([]);
  });
});
