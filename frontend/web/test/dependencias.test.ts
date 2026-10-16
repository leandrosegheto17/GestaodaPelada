import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Pacote = Record<string, Record<string, string> | undefined>;
const pacote = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as Pacote;

describe('dependências do @pelada/web', () => {
  it('não depende de @pelada/dominio nem de @pelada/api', () => {
    const todas = ['dependencies', 'devDependencies', 'peerDependencies'].flatMap((campo) =>
      Object.keys(pacote[campo] ?? {}),
    );
    expect(todas).not.toContain('@pelada/dominio');
    expect(todas).not.toContain('@pelada/api');
  });
});
