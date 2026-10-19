import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { idDoHyperdrive, lerWranglerJsonc } from '../../comum/wrangler-jsonc';

describe('idDoHyperdrive', () => {
  it('lê o id com comentário de linha, de bloco e no fim da linha', () => {
    const texto = `{
      // comentário de linha
      "name": "x", /* bloco */
      "hyperdrive": [
        { "binding": "HYPERDRIVE", "id": "abc123" } // fim de linha com "aspas" e /* aberto
      ]
    }`;
    expect(idDoHyperdrive(texto)).toBe('abc123');
  });

  it('não confunde */ ou // dentro de string com comentário', () => {
    const texto = '{ "name": "a*/b//c", "hyperdrive": [{ "id": "id-/*-x-*/-y" }] }';
    expect(idDoHyperdrive(texto)).toBe('id-/*-x-*/-y');
    expect(lerWranglerJsonc(texto)['name']).toBe('a*/b//c');
  });

  it('falha fechado sem hyperdrive, com id vazio, vazio ou inválido', () => {
    expect(() => idDoHyperdrive('{ "name": "x" }')).toThrow();
    expect(() => idDoHyperdrive('{ "hyperdrive": [{ "id": "" }] }')).toThrow();
    expect(() => idDoHyperdrive('')).toThrow();
    expect(() => idDoHyperdrive('{ hyperdrive: ')).toThrow();
  });

  it('lê o wrangler.jsonc do repositório', () => {
    expect(idDoHyperdrive(readFileSync(join(import.meta.dirname, '../../../../wrangler.jsonc'), 'utf8'))).not.toBe('');
  });
});
