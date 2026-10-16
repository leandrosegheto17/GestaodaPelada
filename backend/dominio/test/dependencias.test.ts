import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pacote = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>;
};

describe('dependências do @pelada/dominio', () => {
  it('não tem dependências de execução', () => {
    expect(Object.keys(pacote.dependencies ?? {})).toEqual([]);
  });
});
