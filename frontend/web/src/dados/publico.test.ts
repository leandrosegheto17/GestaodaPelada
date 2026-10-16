import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rankingPublico } from '@pelada/contrato';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ler } from './cliente';
import { ErroResposta } from './erros';
import { caminhoRanking } from './publico';

const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');
const fixture = (nome: string): JsonBodyType => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8')) as JsonBodyType;

const servidor = setupServer();
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

describe('caminhoRanking', () => {
  it('sem mês não envia mês; com mês envia', () => {
    expect(caminhoRanking('pelada-de-quinta')).toBe('/publico/pelada-de-quinta/ranking');
    expect(caminhoRanking('pelada-de-quinta', '2026-07')).toBe('/publico/pelada-de-quinta/ranking?mes=2026-07');
  });

  it('codifica o slug (sem injeção de caminho)', () => {
    expect(caminhoRanking('a/b')).toBe('/publico/a%2Fb/ranking');
  });
});

describe('ranking público pela API', () => {
  it('resposta válida volta parseada', async () => {
    servidor.use(
      http.get('/api/publico/pelada-de-quinta/ranking', () =>
        HttpResponse.json(fixture('publico-ranking-2026-10.json')),
      ),
    );
    const ranking = await ler(caminhoRanking('pelada-de-quinta'), rankingPublico);
    expect(ranking.grupo.slug).toBe('pelada-de-quinta');
  });

  it('campo a mais (telefone) é recusado pelo schema strict', async () => {
    const corpo = {
      ...(fixture('publico-ranking-2026-10.json') as Record<string, JsonBodyType>),
      telefone: '11999990000',
    };
    servidor.use(http.get('/api/publico/pelada-de-quinta/ranking', () => HttpResponse.json(corpo)));
    await expect(ler(caminhoRanking('pelada-de-quinta'), rankingPublico)).rejects.toBeInstanceOf(ErroResposta);
  });
});
