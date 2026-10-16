import { describe, expect, it } from 'vitest';
import { LIMITES, bytesUtf8 } from '../src/index.js';

describe('limite de senha em bytes', () => {
  it('72 caracteres ASCII cabem em 72 bytes', () => {
    expect(bytesUtf8('a'.repeat(72))).toBeLessThanOrEqual(LIMITES.senha.bytesMax);
  });
  it('72 caracteres multibyte estouram os 72 bytes', () => {
    expect(bytesUtf8('ç'.repeat(72))).toBeGreaterThan(LIMITES.senha.bytesMax);
  });
});
