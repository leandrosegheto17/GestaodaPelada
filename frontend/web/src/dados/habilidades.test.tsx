import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chaveGrupo } from './grupo';
import { useCriarHabilidade, useExcluirHabilidade, useRenomearHabilidade } from './habilidades';

const servidor = setupServer(
  http.post('/api/grupos/g/habilidades', () => HttpResponse.json({ id: 'h1', nome: 'Finta' }, { status: 201 })),
  http.patch('/api/grupos/g/habilidades/h%2F1', () => HttpResponse.json({ id: 'h/1', nome: 'Passe longo' })),
  http.delete('/api/grupos/g/habilidades/h1', () => new HttpResponse(null, { status: 204 })),
);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

function montar() {
  const cliente = new QueryClient();
  cliente.setQueryData([...chaveGrupo('g'), 'jogadores'], { x: 1 });
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return { cliente, envolver };
}
const invalidada = (c: QueryClient) => c.getQueryState([...chaveGrupo('g'), 'jogadores'])?.isInvalidated;

describe('mutações de habilidades', () => {
  it('criar invalida o grupo', async () => {
    const { cliente, envolver } = montar();
    const { result } = renderHook(() => useCriarHabilidade('g'), { wrapper: envolver });
    result.current.mutate('Finta');
    await waitFor(() => expect(invalidada(cliente)).toBe(true));
  });

  it('renomear invalida o grupo (id codificado na URL)', async () => {
    const { cliente, envolver } = montar();
    const { result } = renderHook(() => useRenomearHabilidade('g'), { wrapper: envolver });
    result.current.mutate({ id: 'h/1', nome: 'Passe longo' });
    await waitFor(() => expect(invalidada(cliente)).toBe(true));
  });

  it('excluir invalida o grupo', async () => {
    const { cliente, envolver } = montar();
    const { result } = renderHook(() => useExcluirHabilidade('g'), { wrapper: envolver });
    result.current.mutate('h1');
    await waitFor(() => expect(invalidada(cliente)).toBe(true));
  });
});
