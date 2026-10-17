import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { useEditarPartida, useSalvarPartida, type CorpoSalvarPartida } from './partida';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

let chamadas = 0;
const servidor = setupServer(
  http.post('/api/grupos/g/partidas', () => {
    chamadas += 1;
    return HttpResponse.json({}, { status: 500 });
  }),
  http.put('/api/grupos/g/partidas/2026-10-15', () => {
    chamadas += 1;
    return HttpResponse.json({}, { status: 500 });
  }),
);
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  servidor.resetHandlers();
  chamadas = 0;
});
afterAll(() => servidor.close());

const envolver = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const repetido: CorpoSalvarPartida = {
  data: '2026-10-15',
  choveu: false,
  marcacoes: [
    { jogadorId: A, situacao: 'presente' },
    { jogadorId: A, situacao: 'ausente' },
  ],
};
const invalidos: [string, CorpoSalvarPartida][] = [
  ['jogadorId repetido', repetido],
  ['data malformada', { ...repetido, data: '15/10/2026', marcacoes: [{ jogadorId: A, situacao: 'presente' }] }],
  ['situação fora do enum', { ...repetido, marcacoes: [{ jogadorId: B, situacao: 'talvez' }] }],
  ['jogadorId que não é uuid', { ...repetido, marcacoes: [{ jogadorId: 'x', situacao: 'presente' }] }],
];

describe('validação do corpo antes do envio', () => {
  it.each(invalidos)('POST com %s não dispara requisição e cai em erro', async (_nome, corpo) => {
    const { result } = renderHook(() => useSalvarPartida('g'), { wrapper: envolver });
    result.current.mutate(corpo);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(chamadas).toBe(0);
  });

  it('PUT com jogadorId repetido não dispara requisição', async () => {
    const { result } = renderHook(() => useEditarPartida('g', '2026-10-15'), { wrapper: envolver });
    result.current.mutate(repetido);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(chamadas).toBe(0);
  });

  it('corpo válido chega à API', async () => {
    const { result } = renderHook(() => useSalvarPartida('g'), { wrapper: envolver });
    result.current.mutate({ data: '2026-10-15', choveu: true, marcacoes: [{ jogadorId: A, situacao: 'presente' }] });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(chamadas).toBe(1);
  });
});
