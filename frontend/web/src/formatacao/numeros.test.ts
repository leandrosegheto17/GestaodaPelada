import { describe, expect, it } from 'vitest';
import { formatarPontos } from './numeros';

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
