import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const PERMITIDAS = new Set([
  'name',
  'main',
  'compatibility_date',
  'compatibility_flags',
  'env',
  'assets',
  'hyperdrive',
  'ratelimits',
  'vars',
]);

/** Devolve as chaves proibidas de um wrangler.jsonc (raiz e `env.*`); lança se o arquivo não for JSONC. */
export function chavesForaDaLista(texto: string): string[] {
  const { config, error } = ts.parseConfigFileTextToJson('wrangler.jsonc', texto);
  if (error || typeof config !== 'object' || config === null) throw new Error('wrangler.jsonc inválido');
  const fora: string[] = [];
  const conferir = (objeto: Record<string, unknown>, prefixo: string): void => {
    for (const chave of Object.keys(objeto)) {
      if (!PERMITIDAS.has(chave)) fora.push(`${prefixo}${chave}`);
    }
  };
  conferir(config as Record<string, unknown>, '');
  const ambientes = (config as { env?: Record<string, Record<string, unknown>> }).env ?? {};
  for (const [nome, ambiente] of Object.entries(ambientes)) conferir(ambiente, `env.${nome}.`);
  return fora;
}

describe('wrangler.jsonc (G-13)', () => {
  it('o arquivo do repositório só usa recursos da lista fechada', () => {
    const texto = readFileSync(join(import.meta.dirname, '../../../wrangler.jsonc'), 'utf8');
    expect(chavesForaDaLista(texto)).toEqual([]);
  });

  it.each(['kv_namespaces', 'd1_databases', 'r2_buckets', 'durable_objects', 'queues', 'ai', 'limits', 'placement'])(
    'barra %s na raiz e dentro de env',
    (chave) => {
      expect(chavesForaDaLista(`{ "name": "x", "${chave}": [] }`)).toEqual([chave]);
      expect(chavesForaDaLista(`{ "name": "x", "env": { "teste": { "${chave}": [] } } }`)).toEqual([
        `env.teste.${chave}`,
      ]);
    },
  );

  it('chave só em comentário não falha', () => {
    expect(chavesForaDaLista('{ // "kv_namespaces": []\n "name": "x" }')).toEqual([]);
  });

  it('JSON inválido falha fechado', () => {
    expect(() => chavesForaDaLista('{ name: ')).toThrow();
    expect(() => chavesForaDaLista('')).toThrow();
  });
});
