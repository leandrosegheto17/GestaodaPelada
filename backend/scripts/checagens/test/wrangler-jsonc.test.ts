import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { idDoHyperdrive, lerWranglerJsonc } from '../../comum/wrangler-jsonc';

const ID = 'e06363bd85874f1eaffc6382da6d394b';
const comId = (id: string) => JSON.stringify({ hyperdrive: [{ id }] });

describe('idDoHyperdrive', () => {
  it('lê o id com comentário de linha, de bloco e no fim da linha', () => {
    const texto = `{
      // comentário de linha
      "name": "x", /* bloco */
      "hyperdrive": [
        { "binding": "HYPERDRIVE", "id": "${ID}" } // fim de linha com "aspas" e /* aberto
      ]
    }`;
    expect(idDoHyperdrive(texto)).toBe(ID);
  });

  it('não confunde */ ou // dentro de string com comentário', () => {
    const texto = `{ "name": "a*/b//c", "hyperdrive": [{ "id": "${ID}" }] }`;
    expect(idDoHyperdrive(texto)).toBe(ID);
    expect(lerWranglerJsonc(texto)['name']).toBe('a*/b//c');
  });

  it('falha fechado sem hyperdrive, com id vazio, vazio ou inválido', () => {
    expect(() => idDoHyperdrive('{ "name": "x" }')).toThrow();
    expect(() => idDoHyperdrive('{ "hyperdrive": [{ "id": "" }] }')).toThrow();
    expect(() => idDoHyperdrive('')).toThrow();
    expect(() => idDoHyperdrive('{ hyperdrive: ')).toThrow();
  });

  it.each([
    ['opção', '--config=x'],
    ['aspas e comando', 'a"; touch x'],
    ['substituição de comando', '$(x)'],
    ['maiúsculas', ID.toUpperCase()],
    ['curto', ID.slice(1)],
    ['longo', `${ID}0`],
    ['com espaço', `${ID} `],
    [
      'com quebra de linha no fim',
      `${ID}
`,
    ],
    ['fora de hex', 'g'.repeat(32)],
  ])('rejeita id fora do formato: %s', (_nome, id) => {
    expect(() => idDoHyperdrive(comId(id))).toThrow();
  });

  it('aceita o id no formato', () => {
    expect(idDoHyperdrive(comId(ID))).toBe(ID);
  });

  it('o wrangler.jsonc do repositório tem id no formato (não o valor)', () => {
    expect(idDoHyperdrive(readFileSync(join(import.meta.dirname, '../../../../wrangler.jsonc'), 'utf8'))).toMatch(
      /^[0-9a-f]{32}$/,
    );
  });
});
