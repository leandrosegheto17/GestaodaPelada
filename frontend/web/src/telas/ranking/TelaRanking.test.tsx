import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { recursos, type Recurso } from '../../config/recursos';
import { criarClienteConsultas } from '../../dados/consultas';
import { Component as PaginaRanking } from './PaginaRanking';

vi.mock('../../config/recursos', () => ({ recursos: { ligado: vi.fn(() => true) } }));
vi.mock('../../pwa/armazenamento', () => ({
  grupoLembrado: vi.fn(async () => null),
  esquecerGrupo: vi.fn(),
  rankingAtual: vi.fn(async () => null),
  ultimoRanking: vi.fn(async () => null),
  guardarRankingAtual: vi.fn(async () => undefined),
  guardarUltimoRanking: vi.fn(async () => undefined),
  lembrarGrupo: vi.fn(async () => undefined),
  idAnonimo: vi.fn(async () => '00000000-0000-4000-8000-000000000000'),
}));
vi.mock('../../dados/eventos', () => ({ registrarAbertura: vi.fn() }));

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => vi.mocked(recursos.ligado).mockReturnValue(true));
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => servidor.close());

const URL_RANKING = '/api/publico/pelada-de-quinta/ranking';
let pedidos: string[] = [];

function responder(resposta: (mes: string | null) => Response | Promise<Response>) {
  pedidos = [];
  servidor.use(
    http.get(URL_RANKING, ({ request }) => {
      const mes = new URL(request.url).searchParams.get('mes');
      pedidos.push(mes ?? 'atual');
      return resposta(mes);
    }),
  );
}
const ok = (arquivo: string) => () => HttpResponse.json(fixture(arquivo));

function montar(rota = '/g/pelada-de-quinta') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/g/:slug', Component: PaginaRanking }], { initialEntries: [rota] });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

describe('T01: sucesso', () => {
  it('mostra título, subtítulo, mês, linhas na ordem recebida e navegação limitada pela API', async () => {
    responder(ok('publico-ranking-2026-10.json'));
    montar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Pelada de Quinta' })).toBeInTheDocument();
    expect(screen.getByText('Toda quinta · 20:00')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mês seguinte' })).toBeDisabled();
    const nomes = screen.getAllByRole('rowheader').map((c) => c.textContent);
    expect(nomes.slice(0, 3)).toEqual(['Toninho', 'Bigode', 'Careca']);
    expect(screen.getByText('3 partidas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pular para o ranking' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Área do admin' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Ranking: Pelada de Quinta'));
  });

  it('Mês anterior troca a URL e refaz a chamada com o mês', async () => {
    responder((mes) =>
      HttpResponse.json(fixture(mes === '2026-09' ? 'publico-ranking-2026-07.json' : 'publico-ranking-2026-10.json')),
    );
    const { roteador } = montar();
    await userEvent.click(await screen.findByRole('button', { name: 'Mês anterior, setembro de 2026' }));
    await waitFor(() => expect(roteador.state.location.search).toBe('?mes=2026-09'));
    await waitFor(() => expect(pedidos).toContain('2026-09'));
  });

  it('sem violações do axe', async () => {
    responder(ok('publico-ranking-2026-10.json'));
    const { container } = montar();
    await screen.findByRole('heading', { level: 1, name: 'Pelada de Quinta' });
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('T01: outros estados', () => {
  it('sem jogadores: estado vazio, meses desabilitados e sem Exportar PDF', async () => {
    responder(ok('publico-ranking-vazio.json'));
    const { container } = montar();
    expect(await screen.findByText('Nenhum jogador no ranking ainda.')).toBeInTheDocument();
    for (const botao of within(screen.getByRole('navigation', { name: 'Mês exibido' })).getAllByRole('button')) {
      expect(botao).toBeDisabled();
    }
    expect(screen.queryByRole('button', { name: /Exportar PDF/ })).toBeNull();
    expect(await violacoes(container)).toEqual([]);
  });

  it('mês sem partidas mostra o aviso da tabela', async () => {
    responder(ok('publico-ranking-2026-07.json'));
    montar();
    expect(await screen.findByText('Nenhuma partida registrada neste mês')).toBeInTheDocument();
  });

  it('endereço novo mostra a faixa de atenção', async () => {
    responder(ok('publico-ranking-endereco-novo.json'));
    montar();
    expect(await screen.findByText('O app mudou de endereço.')).toBeInTheDocument();
  });

  it('503 mostra Sem conexão e Tentar de novo refaz a chamada', async () => {
    responder(() => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }));
    montar();
    expect(await screen.findByRole('heading', { level: 1, name: 'Sem conexão' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Conecte-se para ver o ranking.');
    const antes = pedidos.length;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(pedidos.length).toBeGreaterThan(antes));
  });

  it('falha de rede também mostra Sem conexão', async () => {
    responder(() => HttpResponse.error());
    montar();
    expect(await screen.findByRole('heading', { name: 'Sem conexão' }, { timeout: 4000 })).toBeInTheDocument();
  });

  it('carregando: nada antes de 300 ms, esqueleto depois', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    responder(() => new Promise<Response>(() => undefined));
    const { container } = montar();
    act(() => vi.advanceTimersByTime(299));
    expect(container).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando o ranking…');
  });
});

describe('T01: acesso do admin sem conexão', () => {
  it('sem rede, o toque na engrenagem mostra a faixa e não navega', async () => {
    responder(ok('publico-ranking-2026-10.json'));
    const { roteador } = montar();
    await screen.findByRole('heading', { level: 1, name: 'Pelada de Quinta' });
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await userEvent.click(screen.getByRole('link', { name: 'Área do admin' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('É preciso conexão para entrar.');
    expect(roteador.state.location.pathname).toBe('/g/pelada-de-quinta');
    vi.restoreAllMocks();
  });
});

describe('T01: recursos de incrementos futuros', () => {
  const desligar = (...desligados: Recurso[]) =>
    vi.mocked(recursos.ligado).mockImplementation((nome) => !desligados.includes(nome));

  it('tudo ligado: Exportar PDF, "$" e Privacidade presentes', async () => {
    responder(ok('publico-ranking-2026-10.json'));
    montar();
    await screen.findByRole('heading', { level: 1, name: 'Pelada de Quinta' });
    expect(screen.getAllByRole('button', { name: /Exportar PDF/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Financeiro' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacidade');
  });

  it('privacidade desligada: nenhum link para /privacidade', async () => {
    desligar('privacidade');
    responder(ok('publico-ranking-2026-10.json'));
    const { container } = montar();
    await screen.findByRole('heading', { level: 1, name: 'Pelada de Quinta' });
    expect(container.querySelector('a[href="/privacidade"]')).toBeNull();
  });

  it('pdf e financeiro desligados: sem Exportar PDF e sem "$"', async () => {
    desligar('pdf', 'financeiro');
    responder(ok('publico-ranking-2026-10.json'));
    montar();
    await screen.findByRole('heading', { level: 1, name: 'Pelada de Quinta' });
    expect(screen.queryByRole('button', { name: /Exportar PDF/ })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Financeiro' })).toBeNull();
  });
});
