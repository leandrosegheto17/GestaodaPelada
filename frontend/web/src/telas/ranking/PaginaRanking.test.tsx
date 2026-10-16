import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { violacoes } from '../../../test/apoio/axe';
import { criarClienteConsultas } from '../../dados/consultas';
import * as armazenamento from '../../pwa/armazenamento';
import { Component as PaginaRanking } from './PaginaRanking';

vi.mock('../../pwa/armazenamento', () => ({ grupoLembrado: vi.fn(), esquecerGrupo: vi.fn() }));

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const lembrado = vi.mocked(armazenamento.grupoLembrado);
const esquecer = vi.mocked(armazenamento.esquecerGrupo);
beforeEach(() => {
  lembrado.mockReset();
  esquecer.mockReset();
});

let chamadas = 0;
function api(slug: string, resposta: () => Response) {
  chamadas = 0;
  servidor.use(
    http.get(`/api/publico/${slug}/ranking`, () => {
      chamadas += 1;
      return resposta();
    }),
  );
}
const naoEncontrado = (codigo?: string) => () => {
  const corpo = fixture('erro-nao-encontrado.json') as { erro: Record<string, JsonBodyType> };
  return HttpResponse.json(codigo ? { erro: { ...corpo.erro, codigo } } : corpo, { status: 404 });
};

function montar(rota: string) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter([{ path: '/g/:slug', Component: PaginaRanking }], { initialEntries: [rota] });
  const { container } = render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return { roteador, container };
}

describe('PaginaRanking: grupo indisponível (T03)', () => {
  it('404 mostra a T03 sem ação e esquece o grupo lembrado quando é este', async () => {
    api('futebol-da-firma', naoEncontrado());
    lembrado.mockResolvedValue('futebol-da-firma');
    montar('/g/futebol-da-firma');
    expect(await screen.findByRole('heading', { level: 1, name: 'Grupo indisponível' })).toBeInTheDocument();
    const principal = screen.getByRole('main');
    expect(principal.querySelector('a, button')).toBeNull();
    await waitFor(() => expect(esquecer).toHaveBeenCalledTimes(1));
    expect(chamadas).toBe(1);
  });

  it('404 de um link digitado errado não apaga o grupo lembrado de outro', async () => {
    api('futebol-da-firma', naoEncontrado());
    lembrado.mockResolvedValue('pelada-de-quinta');
    montar('/g/futebol-da-firma');
    await screen.findByRole('heading', { name: 'Grupo indisponível' });
    await waitFor(() => expect(lembrado).toHaveBeenCalled());
    expect(esquecer).not.toHaveBeenCalled();
  });

  it('código diferente no 404 mostra a mesma tela', async () => {
    api('futebol-da-firma', naoEncontrado('indisponivel'));
    lembrado.mockResolvedValue(null);
    montar('/g/futebol-da-firma');
    expect(await screen.findByRole('heading', { name: 'Grupo indisponível' })).toBeInTheDocument();
    expect(
      screen.getByText('Este grupo não está disponível no momento. Fale com o admin do seu grupo.'),
    ).toBeInTheDocument();
  });

  it.each(['ABC', 'a%2Fb'])('slug malformado %s mostra a T03 sem consultar a API', async (slug) => {
    chamadas = 0;
    servidor.use(http.get('/api/publico/*/ranking', () => ((chamadas += 1), HttpResponse.json({}))));
    montar(`/g/${slug}`);
    expect(await screen.findByRole('heading', { name: 'Grupo indisponível' })).toBeInTheDocument();
    expect(chamadas).toBe(0);
  });

  it('mês malformado sai da URL', async () => {
    api('pelada-de-quinta', () => HttpResponse.json(fixture('publico-ranking-2026-10.json')));
    const { roteador } = montar('/g/pelada-de-quinta?mes=2026-13');
    await waitFor(() => expect(roteador.state.location.search).toBe(''));
  });

  it('sem violações do axe na T03', async () => {
    api('futebol-da-firma', naoEncontrado());
    lembrado.mockResolvedValue(null);
    const { container } = montar('/g/futebol-da-firma');
    await screen.findByRole('heading', { name: 'Grupo indisponível' });
    expect(await violacoes(container)).toEqual([]);
  });
});
