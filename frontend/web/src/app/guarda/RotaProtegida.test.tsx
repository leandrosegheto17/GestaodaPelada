import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { criarClienteConsultas } from '../../dados/consultas';
import { useSair } from '../../dados/sessao';
import { RotaProtegida } from './RotaProtegida';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8'));

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

function montar(rota: string) {
  const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
  const roteador = createMemoryRouter(
    [
      { element: <RotaProtegida />, children: [{ path: '/admin/:grupoId?', element: <p>Tela do admin</p> }] },
      { path: '/entrar', element: <p>Tela de entrada</p> },
      { path: '/entrar/nova-senha', element: <p>Tela de nova senha</p> },
    ],
    { initialEntries: [rota] },
  );
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>,
  );
  return roteador;
}

type Resposta = JsonBodyType | 'rede' | 401;

function sessao(corpo: Resposta) {
  servidor.use(
    http.get('/api/sessao/eu', () => {
      if (corpo === 'rede') return HttpResponse.error();
      if (corpo === 401) return HttpResponse.json(fixture('erro-nao-autenticado.json'), { status: 401 });
      return HttpResponse.json(corpo);
    }),
  );
}

describe('RotaProtegida', () => {
  it('401 leva para a entrada com o destino', async () => {
    sessao(401);
    const roteador = montar('/admin/g-quinta?mes=2026-10');
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar'));
    expect(roteador.state.location.search).toBe('?destino=%2Fadmin%2Fg-quinta%3Fmes%3D2026-10');
  });

  it('escopo de troca de senha leva para a nova senha', async () => {
    sessao(fixture('sessao-eu-troca-de-senha.json'));
    const roteador = montar('/admin');
    await waitFor(() => expect(roteador.state.location.pathname).toBe('/entrar/nova-senha'));
  });

  it('admin com vínculo vê a tela filha', async () => {
    sessao(fixture('sessao-eu-admin.json'));
    montar('/admin/g-quinta');
    expect(await screen.findByText('Tela do admin')).toBeInTheDocument();
  });

  it('erro de rede ao ler a sessão deixa a tela filha abrir, sem redirecionar', async () => {
    sessao('rede');
    const roteador = montar('/admin/g-quinta');
    expect(await screen.findByText('Tela do admin')).toBeInTheDocument();
    expect(roteador.state.location.pathname).toBe('/admin/g-quinta');
  });
});

describe('useSair', () => {
  it('envia POST com X-Pelada e esvazia o cache', async () => {
    let cabecalho: string | null = null;
    servidor.use(
      http.post('/api/sessao/sair', ({ request }) => {
        cabecalho = request.headers.get('x-pelada');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const cliente = criarClienteConsultas({ aoNaoAutenticado: () => undefined });
    cliente.setQueryData(['qualquer'], { dado: 'de admin' });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSair(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(cliente.getQueryCache().getAll()).toHaveLength(0));
    expect(cabecalho).toBe('1');
  });
});
