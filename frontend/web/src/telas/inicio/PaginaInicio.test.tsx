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
import { type Recurso, recursos } from '../../config/recursos';
import { criarClienteConsultas } from '../../dados/consultas';
import { estadoRetorno } from '../../dados/retorno';
import { Component as PaginaInicio } from './PaginaInicio';

vi.mock('../../config/recursos', () => ({ recursos: { ligado: vi.fn(() => true) } }));

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

let pedidos = 0;
function api(resposta: () => Response | Promise<Response>, grupo = 'g-quinta') {
  pedidos = 0;
  servidor.use(
    http.get(`/api/grupos/${grupo}`, () => {
      pedidos += 1;
      return resposta();
    }),
  );
}
const ok = (arquivo: string) => () => HttpResponse.json(fixture(arquivo));

interface Entrada {
  rota?: string;
  state?: unknown;
}
function montar({ rota = '/admin/g-quinta', state }: Entrada = {}) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId', Component: PaginaInicio }], {
    initialEntries: [
      { pathname: rota.split('?')[0]!, search: rota.includes('?') ? `?${rota.split('?')[1]}` : '', state },
    ],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { container, roteador };
}

const desligar = (...recursosDesligados: Recurso[]) =>
  vi.mocked(recursos.ligado).mockImplementation((nome) => !recursosDesligados.includes(nome));

describe('PaginaInicio (T09): sucesso', () => {
  it('Dia de jogo com data sugerida, simulador e escalação confirmada', async () => {
    api(ok('grupo-quinta.json'));
    montar();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Início do admin: Pelada de Quinta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lançar partida de qui, 22/10' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/partidas/nova?data=2026-10-22',
    );
    expect(screen.getByRole('link', { name: 'Simulador: qui, 22/10' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/simulador',
    );
    expect(screen.getByText('Escalação de 22/10 confirmada')).toBeInTheDocument();
  });

  it('oito seções na ordem, com as metas do mockup', async () => {
    api(ok('grupo-quinta.json'));
    montar();
    const lista = await screen.findByRole('list');
    const textos = within(lista)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(textos).toEqual([
      'Partidas3 em outubro',
      'Jogadores20 ativos',
      'Habilidades6 habilidades',
      'PontuaçãoVigente desde 01/09/2026',
      'Admins2 admins',
      'Dados do grupoToda quinta · 20:00 · link do ranking',
      'Uso do appEsta semana: 9 aparelhos',
      'FinanceiroSaldo R$ 1.245,50',
    ]);
    expect(screen.getByRole('link', { name: /Financeiro/ })).toHaveAttribute('href', '/admin/g-quinta/financeiro');
  });

  it('sem permissão de financeiro, a seção não aparece', async () => {
    api(ok('grupo-quinta-sem-financeiro.json'));
    montar();
    await screen.findByRole('list');
    expect(screen.queryByText('Financeiro')).toBeNull();
  });

  it('recursos desligados: sem Simulador/status e sem Financeiro mesmo com permissão', async () => {
    desligar('simulador', 'financeiro');
    api(ok('grupo-quinta.json'));
    montar();
    await screen.findByRole('list');
    expect(screen.queryByRole('link', { name: /Simulador/ })).toBeNull();
    expect(screen.queryByText(/Escalação/)).toBeNull();
    expect(screen.queryByText('Financeiro')).toBeNull();
  });

  it('?negado=financeiro mostra o aviso', async () => {
    api(ok('grupo-quinta.json'));
    montar({ rota: '/admin/g-quinta?negado=financeiro' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem acesso ao financeiro deste grupo.');
  });

  it('sem violações do axe', async () => {
    api(ok('grupo-quinta.json'));
    const { container } = montar();
    await screen.findByRole('list');
    expect(await violacoes(container)).toEqual([]);
  });
});

describe('PaginaInicio (T09): outros estados', () => {
  it('depois de salvar: Editar partida, próxima escalação e faixa de retorno só com o estado', async () => {
    api(ok('grupo-quinta-depois-de-salvar.json'));
    const { container } = montar({ state: estadoRetorno({ tipo: 'partida-salva', data: '2026-10-22' }) });
    expect(await screen.findByRole('link', { name: 'Editar partida de qui, 22/10' })).toHaveAttribute(
      'href',
      '/admin/g-quinta/partidas/2026-10-22',
    );
    expect(screen.getByText('Nenhuma escalação confirmada para 29/10')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Partida de 22/10 salva.');
    expect(screen.getByRole('link', { name: 'Ver ranking' })).toHaveAttribute('href', '/g/pelada-de-quinta');
    expect(await violacoes(container)).toEqual([]);
  });

  it('sem estado ou com estado inválido, não há faixa', async () => {
    api(ok('grupo-quinta.json'));
    montar({ state: { retorno: { tipo: 'x', data: 'y' } } });
    await screen.findByRole('list');
    expect(screen.queryByText(/salva\./)).toBeNull();
  });

  it('sem jogadores: convite para cadastrar, sem Simulador, metas de zero', async () => {
    api(ok('grupo-domingo.json'), 'g-domingo');
    const { container } = montar({ rota: '/admin/g-domingo' });
    expect(await screen.findByText('Cadastre os jogadores para lançar partidas.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar jogadores' })).toHaveAttribute(
      'href',
      '/admin/g-domingo/jogadores/novo',
    );
    expect(screen.queryByRole('link', { name: /Simulador/ })).toBeNull();
    const lista = screen.getByRole('list');
    expect(lista).toHaveTextContent('Nenhum cadastrado');
    expect(lista).toHaveTextContent('Pesos padrão');
    expect(lista).toHaveTextContent('Sem uso registrado');
    expect(screen.queryByText('Financeiro')).toBeNull();
    expect(await violacoes(container)).toEqual([]);
  });

  it('carregando: nada antes de 300 ms, esqueleto depois', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    api(() => new Promise<Response>(() => undefined));
    const { container } = montar();
    act(() => vi.advanceTimersByTime(299));
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('503 mostra o erro padrão e Tentar de novo refaz a chamada', async () => {
    api(() => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar. Verifique a conexão.');
    const antes = pedidos;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(pedidos).toBeGreaterThan(antes));
  });
});
