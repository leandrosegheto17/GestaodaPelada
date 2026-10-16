import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { escrever, ler, semCorpo } from './cliente';
import { ErroApi, ErroRede, ErroResposta } from './erros';

const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8'));

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const objeto = z.object({ n: z.number() });

describe('ler / escrever', () => {
  it('GET devolve o objeto parseado, sem X-Pelada', async () => {
    let cabecalho: string | null = 'x';
    servidor.use(
      http.get('/api/a', ({ request }) => {
        cabecalho = request.headers.get('x-pelada');
        return HttpResponse.json({ n: 1 });
      }),
    );
    expect(await ler('/a', objeto)).toEqual({ n: 1 });
    expect(cabecalho).toBeNull();
  });

  it('resposta com tipo errado vira ErroResposta', async () => {
    servidor.use(http.get('/api/a', () => HttpResponse.json({ n: 'x' })));
    await expect(ler('/a', objeto)).rejects.toBeInstanceOf(ErroResposta);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)('%s leva X-Pelada e Content-Type', async (metodo) => {
    let visto: { x: string | null; tipo: string | null } | undefined;
    servidor.use(
      http.all('/api/a', ({ request }) => {
        visto = { x: request.headers.get('x-pelada'), tipo: request.headers.get('content-type') };
        return HttpResponse.json({ n: 2 });
      }),
    );
    expect(await escrever(metodo, '/a', { k: 1 }, objeto)).toEqual({ n: 2 });
    expect(visto).toEqual({ x: '1', tipo: 'application/json' });
  });

  it('caminho inválido falha antes do fetch', () => {
    expect(() => ler('//evil.com/x', objeto)).toThrow();
    expect(() => ler('x', objeto)).toThrow();
  });

  it('204 devolve undefined', async () => {
    servidor.use(http.post('/api/a', () => new HttpResponse(null, { status: 204 })));
    expect(await escrever('POST', '/a', undefined, semCorpo)).toBeUndefined();
  });

  it('422 vira ErroApi com campos', async () => {
    servidor.use(http.get('/api/a', () => HttpResponse.json(fixture('erro-validacao.json'), { status: 422 })));
    const erro = await ler('/a', objeto).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroApi);
    expect((erro as ErroApi).status).toBe(422);
    expect((erro as ErroApi).campos).toHaveProperty('apelido');
  });

  it('401 vira ErroApi 401', async () => {
    servidor.use(http.get('/api/a', () => HttpResponse.json(fixture('erro-nao-autenticado.json'), { status: 401 })));
    const erro = await ler('/a', objeto).catch((e: unknown) => e);
    expect((erro as ErroApi).status).toBe(401);
  });

  it('500 com HTML vira ErroResposta', async () => {
    servidor.use(http.get('/api/a', () => new HttpResponse('<html>', { status: 500 })));
    const erro = await ler('/a', objeto).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroResposta);
    expect((erro as ErroResposta).status).toBe(500);
  });

  it('falha de rede vira ErroRede; abortar não', async () => {
    servidor.use(http.get('/api/a', () => HttpResponse.error()));
    await expect(ler('/a', objeto)).rejects.toBeInstanceOf(ErroRede);
    const controle = new AbortController();
    controle.abort();
    const erro = await ler('/a', objeto, { signal: controle.signal }).catch((e: unknown) => e);
    expect(erro).not.toBeInstanceOf(ErroRede);
  });
});
