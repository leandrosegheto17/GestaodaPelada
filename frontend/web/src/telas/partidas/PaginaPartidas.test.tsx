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
import { Component as PaginaPartidas } from './PaginaPartidas';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  servidor.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => servidor.close());

let meses: (string | null)[] = [];
function api(partidas: (mes: string | null) => Response | Promise<Response>) {
  meses = [];
  servidor.use(
    http.get('/api/grupos/g-quinta', () => HttpResponse.json(fixture('grupo-quinta.json'))),
    http.get('/api/grupos/g-quinta/partidas', ({ request }) => {
      const mes = new URL(request.url).searchParams.get('mes');
      meses.push(mes);
      return partidas(mes);
    }),
  );
}
const porMes = (mes: string | null) =>
  HttpResponse.json(fixture(mes === '2026-07' ? 'partidas-2026-07.json' : 'partidas-2026-10.json'));

function montar(rota = '/admin/g-quinta/partidas') {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const [pathname, busca] = rota.split('?');
  const roteador = createMemoryRouter([{ path: '/admin/:grupoId/partidas', Component: PaginaPartidas }], {
    initialEntries: [{ pathname: pathname!, search: busca ? `?${busca}` : '' }],
  });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

describe('PaginaPartidas (T10)', () => {
  it('lista do mês na ordem recebida, com chuva e contagens', async () => {
    api(porMes);
    montar();
    const lista = await screen.findByRole('list');
    const itens = within(lista).getAllByRole('listitem');
    expect(itens.map((li) => li.querySelector('a')?.getAttribute('href'))).toEqual([
      '/admin/g-quinta/partidas/2026-10-15',
      '/admin/g-quinta/partidas/2026-10-08',
      '/admin/g-quinta/partidas/2026-10-01',
    ]);
    expect(itens[0]).toHaveTextContent('Quinta, 15/10/2026');
    expect(itens[0]).toHaveTextContent('15 P · 0 L · 1 E');
    expect(itens[1]).toHaveTextContent('chuva · 12 P · 1 L · 0 E');
    expect(itens[1]?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(itens[0]).toHaveTextContent('15 presentes, 0 lesionados, 1 expulso');
    expect(meses).toEqual(['2026-10']);
  });

  it('navegador de mês: seguinte desabilitado; anterior troca a URL e refaz a chamada', async () => {
    api(porMes);
    const { roteador } = montar();
    expect(await screen.findByRole('button', { name: 'Mês seguinte' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior, setembro de 2026' }));
    await waitFor(() => expect(roteador.state.location.search).toBe('?mes=2026-09'));
    await waitFor(() => expect(meses).toContain('2026-09'));
  });

  it('mês sem partidas: aviso, Nova partida e meses habilitados', async () => {
    api(porMes);
    montar('/admin/g-quinta/partidas?mes=2026-07');
    expect(await screen.findByText('Nenhuma partida neste mês.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova partida' })).toHaveAttribute('href', '/admin/g-quinta/partidas/nova');
    expect(screen.getByRole('button', { name: /Mês anterior/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Mês seguinte/ })).toBeEnabled();
  });

  it('?mes= malformado é removido e não vai à API', async () => {
    api(porMes);
    const { roteador } = montar('/admin/g-quinta/partidas?mes=2026-13');
    await waitFor(() => expect(roteador.state.location.search).toBe(''));
    await screen.findByRole('list');
    expect(meses).not.toContain('2026-13');
  });

  it('503 mostra o erro padrão e Tentar de novo refaz a chamada', async () => {
    api(() => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }));
    montar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar. Verifique a conexão.');
    const antes = meses.length;
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(meses.length).toBeGreaterThan(antes));
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

  it('sem violações do axe: sucesso, vazio e erro', async () => {
    api(porMes);
    const sucesso = montar();
    await screen.findByRole('list');
    expect(await violacoes(sucesso.container)).toEqual([]);
    sucesso.container.remove();
    const vazio = montar('/admin/g-quinta/partidas?mes=2026-07');
    await screen.findByText('Nenhuma partida neste mês.');
    expect(await violacoes(vazio.container)).toEqual([]);
    vazio.container.remove();
    api(() => HttpResponse.json(fixture('erro-interno.json'), { status: 503 }));
    const erro = montar();
    await screen.findByRole('alert');
    expect(await violacoes(erro.container)).toEqual([]);
  });
});
