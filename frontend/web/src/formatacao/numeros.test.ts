import { describe, expect, it } from 'vitest';
import { formatarNivel, formatarPontos, pontosEscritos, pontosFalados } from './numeros';

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

describe('pontosEscritos', () => {
  it.each([
    [1, '1 ponto'],
    [0, '0 pontos'],
    [18, '18 pontos'],
    [-1, '−1 ponto'],
  ])('%i', (n, texto) => {
    expect(pontosEscritos(n)).toBe(texto);
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

describe('formatarNivel', () => {
  it.each([
    [6.1, '6,1'],
    [6, '6,0'],
    [10, '10,0'],
    [5.25, '5,3'],
  ])('%s', (nivel, texto) => {
    expect(formatarNivel(nivel)).toBe(texto);
  });

  it('valor inválido lança', () => {
    expect(() => formatarNivel(NaN)).toThrow(RangeError);
  });
});
