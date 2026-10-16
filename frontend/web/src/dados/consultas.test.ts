import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { escrever, ler } from './cliente';
import { criarClienteConsultas } from './consultas';

const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8'));

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const objeto = z.object({ n: z.number() });

async function consultar(resposta: () => Response) {
  let chamadas = 0;
  servidor.use(
    http.get('/api/a', () => {
      chamadas += 1;
      return resposta();
    }),
  );
  const aoNaoAutenticado = vi.fn();
  const cliente = criarClienteConsultas({ aoNaoAutenticado });
  await cliente.fetchQuery({ queryKey: ['a'], queryFn: () => ler('/a', objeto) }).catch(() => undefined);
  return { chamadas, aoNaoAutenticado };
}

describe('criarClienteConsultas', () => {
  it('erro de rede: 2 chamadas', async () => {
    expect((await consultar(() => HttpResponse.error())).chamadas).toBe(2);
  });

  it.each([
    [404, 'erro-nao-encontrado.json'],
    [422, 'erro-validacao.json'],
    [401, 'erro-nao-autenticado.json'],
    [500, 'erro-interno.json'],
  ])('%i: 1 chamada', async (status, arquivo) => {
    expect((await consultar(() => HttpResponse.json(fixture(arquivo), { status }))).chamadas).toBe(1);
  });

  it('401 em consulta chama aoNaoAutenticado uma vez', async () => {
    const { aoNaoAutenticado } = await consultar(() =>
      HttpResponse.json(fixture('erro-nao-autenticado.json'), { status: 401 }),
    );
    expect(aoNaoAutenticado).toHaveBeenCalledTimes(1);
  });

  it('401 em mutação chama aoNaoAutenticado e não repete', async () => {
    let chamadas = 0;
    servidor.use(
      http.post('/api/a', () => {
        chamadas += 1;
        return HttpResponse.json(fixture('erro-nao-autenticado.json'), { status: 401 });
      }),
    );
    const aoNaoAutenticado = vi.fn();
    const cliente = criarClienteConsultas({ aoNaoAutenticado });
    await cliente
      .getMutationCache()
      .build(cliente, { mutationFn: () => escrever('POST', '/a', {}, objeto) })
      .execute(undefined)
      .catch(() => undefined);
    expect(chamadas).toBe(1);
    expect(aoNaoAutenticado).toHaveBeenCalledTimes(1);
  });
});
