import { eventoPublicoCorpo } from '@pelada/contrato';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registrarAbertura, reiniciarAberturas } from './eventos';

vi.mock('../pwa/armazenamento', () => ({ idAnonimo: vi.fn(async () => '11111111-1111-4111-8111-111111111111') }));

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => reiniciarAberturas());
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

interface Chegada {
  corpo: unknown;
  xPelada: string | null;
}
let chegadas: Chegada[] = [];

function api(status = 204) {
  chegadas = [];
  servidor.use(
    http.post('/api/publico/pelada-de-quinta/eventos', async ({ request }) => {
      chegadas.push({ corpo: await request.json(), xPelada: request.headers.get('x-pelada') });
      return status === 204 ? new HttpResponse(null, { status }) : HttpResponse.error();
    }),
  );
}
const esperar = () => new Promise((resolver) => setTimeout(resolver, 50));

describe('registrarAbertura', () => {
  it('um POST por abertura, mesmo chamado várias vezes', async () => {
    api();
    registrarAbertura('pelada-de-quinta');
    registrarAbertura('pelada-de-quinta');
    registrarAbertura('pelada-de-quinta');
    await esperar();
    expect(chegadas).toHaveLength(1);
  });

  it('o corpo confere com o contrato e leva X-Pelada', async () => {
    api();
    registrarAbertura('pelada-de-quinta');
    await esperar();
    expect(eventoPublicoCorpo.safeParse(chegadas[0]?.corpo).success).toBe(true);
    expect(chegadas[0]?.corpo).toEqual({
      tipo: 'ranking_aberto',
      dispositivoId: '11111111-1111-4111-8111-111111111111',
    });
    expect(chegadas[0]?.xPelada).toBe('1');
  });

  it('o mesmo dispositivoId em duas aberturas', async () => {
    api();
    registrarAbertura('pelada-de-quinta');
    await esperar();
    reiniciarAberturas();
    registrarAbertura('pelada-de-quinta');
    await esperar();
    expect(chegadas).toHaveLength(2);
    expect(chegadas[0]?.corpo).toEqual(chegadas[1]?.corpo);
  });

  it('falha de rede é engolida, sem lançar nem repetir', async () => {
    api(0);
    expect(() => registrarAbertura('pelada-de-quinta')).not.toThrow();
    await esperar();
    expect(chegadas).toHaveLength(1);
  });
});
