import { describe, expect, it } from 'vitest';
import { contemBusca, normalizarBusca } from './texto';

describe('normalizarBusca', () => {
  it('tira acento, caixa e espaços das pontas', () => {
    expect(normalizarBusca('  Ação ')).toBe('acao');
    expect(normalizarBusca('Léo Baiano')).toBe('leo baiano');
    expect(normalizarBusca('Zé')).toBe('ze');
  });
});

describe('contemBusca', () => {
  it.each([
    ['Léo Baiano', 'leo', true],
    ['Zé Carlos', 'ZÉ', true],
    ['Zé Carlos', '  carlos ', true],
    ['Bigode', '', true],
    ['Bigode', 'x', false],
  ])('%s / %j', (texto, termo, esperado) => {
    expect(contemBusca(texto, termo)).toBe(esperado);
  });

  it('termo longo não quebra', () => {
    expect(contemBusca('Bigode', 'a'.repeat(200))).toBe(false);
  });
});
