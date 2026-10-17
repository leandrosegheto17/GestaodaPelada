import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(import.meta.dirname, '..');
const MOCKUP = join(RAIZ, '../../.md/mockup');

describe('aparência = mockup (G-19)', () => {
  it('tokens.css é cópia byte a byte do mockup', () => {
    const app = readFileSync(join(RAIZ, 'src/estilos/tokens.css'));
    const mockup = readFileSync(join(MOCKUP, 'tokens.css'));
    expect(app.equals(mockup)).toBe(true);
  });

  it('as fontes de public/fontes são as do mockup, byte a byte, sem sobra nem falta', () => {
    const doMockup = readdirSync(join(MOCKUP, 'fontes'))
      .filter((n) => n !== 'baixar-fontes.mjs')
      .sort();
    const doApp = readdirSync(join(RAIZ, 'public/fontes'), { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
    expect(doApp).toEqual(doMockup);
    for (const nome of doMockup) {
      const a = readFileSync(join(RAIZ, 'public/fontes', nome));
      const b = readFileSync(join(MOCKUP, 'fontes', nome));
      expect(a.equals(b), nome).toBe(true);
    }
  });

  it('o index.html não tem script nem estilo inline nem recurso de terceiro', () => {
    const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/);
    expect(html).not.toMatch(/<style/);
    expect(html).not.toMatch(/https?:\/\//);
  });
});
