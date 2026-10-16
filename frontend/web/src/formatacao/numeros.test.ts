import { describe, expect, it } from 'vitest';
import { formatarPontos, pontosFalados } from './numeros';

describe('formatarPontos', () => {
  it('usa U+2212 para negativos', () => {
    expect(formatarPontos(-1)).toBe('−1');
    expect(formatarPontos(-1).charCodeAt(0)).toBe(0x2212);
    expect(formatarPontos(0)).toBe('0');
    expect(formatarPontos(10)).toBe('10');
  });

  it('não inteiro lança', () => {
    expect(() => formatarPontos(1.5)).toThrow(RangeError);
  });
});

describe('pontosFalados', () => {
  it.each([
    [1, '1 ponto'],
    [2, '2 pontos'],
    [0, '0 pontos'],
    [-1, 'menos 1 ponto'],
    [-2, 'menos 2 pontos'],
  ])('%i', (n, texto) => {
    expect(pontosFalados(n)).toBe(texto);
  });

  it('inteiro não seguro lança', () => {
    expect(() => pontosFalados(2 ** 53)).toThrow(RangeError);
    expect(() => pontosFalados(0.5)).toThrow(RangeError);
  });
});
