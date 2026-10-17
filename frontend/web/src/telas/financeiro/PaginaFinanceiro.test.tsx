import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaFinanceiro } from './PaginaFinanceiro';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const arquivo = (nome: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as Record<string, unknown>;
const fixture = (nome: string): JsonBodyType => arquivo(nome) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  vi.useRealTimers();
  servidor.resetHandlers();
});
afterAll(() => servidor.close());

let meses: (string | null)[] = [];
function api(resposta: (mes: string | null) => Response = () => HttpResponse.json(fixture('financeiro-2026-10.json'))) {
  meses = [];
  servidor.use(
    http.get('/api/grupos/g-quinta/financeiro/mes', ({ request }) => {
      const mes = new URL(request.url).searchParams.get('mes');
      meses.push(mes);
      return resposta(mes);
    }),
  );
}

function montar(rota = '/admin/g-quinta/financeiro') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/financeiro', Component: PaginaFinanceiro }], {
    initialEntries: [rota],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container, roteador };
}

describe('PaginaFinanceiro (T22)', () => {
  it('sucesso: saldo, grade, pagamentos com interruptores e lançamentos com a linha agrupada', async () => {
    api();
    montar();
    expect(await screen.findByText('R$ 1.245,50')).toBeInTheDocument();
    expect(screen.getByText('Entradas no mês')).toBeInTheDocument();
    // Entradas do mês e total da linha agrupada de mensalidades.
    expect(screen.getAllByText('R$ 1.200,00')).toHaveLength(2);
    expect(screen.getByText('4 jogadores')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pagamentos do mês · R$ 75,00' })).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(20);
    expect(screen.getByRole('switch', { name: 'Pagou: Alemão' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Pagou: Fumaça' })).not.toBeChecked();
    const bolas = screen.getByRole('link', { name: /Bolas novas \(2\)/ });
    expect(bolas).toHaveAttribute('href', '/admin/g-quinta/financeiro/lancamentos/l-bolas');
    expect(within(bolas).getByText('− R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('16 mensalidades de 10/2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo lançamento' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/financeiro/lancamentos/novo',
    );
    expect(screen.getByRole('link', { name: 'Configurar caixa' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/financeiro/config',
    );
  });

  it('a linha das mensalidades abre para mostrar cada uma', async () => {
    api();
    montar();
    const linha = await screen.findByRole('button', { name: /16 mensalidades de 10\/2026/ });
    expect(linha).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(linha);
    expect(linha).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Mensalidade Toninho 10\/2026/ })).toBeInTheDocument();
  });

  it('navegar pelo mês: o botão anterior pede ?mes=2026-09', async () => {
    api();
    montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Mês anterior, setembro de 2026' }));
    await waitFor(() => expect(meses).toContain('2026-09'));
    expect(screen.getByRole('button', { name: 'Mês seguinte' })).toBeDisabled();
  });

  it('saldo negativo: "−" e a palavra "negativo" para leitores de tela', async () => {
    const base = arquivo('financeiro-2026-10.json');
    api(() => HttpResponse.json({ ...base, saldoAtualCentavos: -5_000 } as JsonBodyType));
    montar();
    const valor = await screen.findByText('− R$ 50,00');
    expect(within(valor.parentElement as HTMLElement).getByText('(negativo)')).toBeInTheDocument();
  });

  it('sem mensalidade: o título dos pagamentos não leva valor; sem jogadores ativos: mensagem', async () => {
    const base = arquivo('financeiro-2026-10.json') as { config: Record<string, unknown> };
    api(() =>
      HttpResponse.json({
        ...base,
        config: { ...base.config, mensalidadeCentavos: null },
        pagamentos: [],
      } as JsonBodyType),
    );
    montar();
    expect(await screen.findByRole('heading', { name: 'Pagamentos do mês' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum jogador ativo neste mês.')).toBeInTheDocument();
  });

  it('sem lançamentos: mensagem no lugar da lista', async () => {
    const base = arquivo('financeiro-2026-10.json');
    api(() => HttpResponse.json({ ...base, lancamentos: [] } as JsonBodyType));
    montar();
    expect(await screen.findByText('Nenhum lançamento neste mês.')).toBeInTheDocument();
  });

  it('caixa não configurado: vazio com "Configurar caixa"', async () => {
    api(() => HttpResponse.json(fixture('financeiro-sem-config.json')));
    montar();
    expect(await screen.findByRole('heading', { name: 'Caixa não configurado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurar caixa' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/financeiro/config',
    );
    expect(screen.queryByRole('link', { name: 'Novo lançamento' })).not.toBeInTheDocument();
  });

  it('403: "Sem acesso" com Voltar para o início', async () => {
    api(() => HttpResponse.json(fixture('erro-sem-permissao.json'), { status: 403 }));
    montar();
    expect(await screen.findByRole('heading', { name: 'Sem acesso' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Você não tem acesso ao financeiro deste grupo.');
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/admin/g-quinta');
  });

  it('falha de rede: aviso com nova tentativa', async () => {
    servidor.use(http.get('/api/grupos/g-quinta/financeiro/mes', () => HttpResponse.error()));
    montar();
    expect(await screen.findByRole('button', { name: /tentar de novo/i })).toBeInTheDocument();
  });

  it('?mes malformado na URL: tira o parâmetro e pede o mês atual', async () => {
    api();
    const { roteador } = montar('/admin/g-quinta/financeiro?mes=2026-13');
    await screen.findByText('R$ 1.245,50');
    expect(meses).toEqual([null]);
    expect(roteador.state.location.search).toBe('');
  });

  it('axe: sem violações no sucesso, no vazio e no 403', async () => {
    api();
    const { container } = montar();
    await screen.findByText('R$ 1.245,50');
    expect(await violacoes(container)).toEqual([]);
  });

  it('axe: sem violações com o caixa não configurado', async () => {
    api(() => HttpResponse.json(fixture('financeiro-sem-config.json')));
    const { container } = montar();
    await screen.findByRole('heading', { name: 'Caixa não configurado' });
    expect(await violacoes(container)).toEqual([]);
  });

  it('carregando: nada antes de 300 ms, esqueleto depois', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    servidor.use(http.get('/api/grupos/g-quinta/financeiro/mes', () => new Promise<Response>(() => undefined)));
    const { container } = montar();
    act(() => vi.advanceTimersByTime(299));
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('axe: sem violações no 403', async () => {
    api(() => HttpResponse.json(fixture('erro-sem-permissao.json'), { status: 403 }));
    const { container } = montar();
    await screen.findByRole('heading', { name: 'Sem acesso' });
    expect(await violacoes(container)).toEqual([]);
  });
});
