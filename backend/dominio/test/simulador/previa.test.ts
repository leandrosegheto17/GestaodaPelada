import { describe, expect, it } from 'vitest';
import { calcularPrevia, composicaoVarios } from '../../src/index.js';

describe('composicaoVarios', () => {
  it.each([
    [22, 4, 6, 5, 2],
    [20, 4, 5, 5, 0],
    [18, 4, 5, 4, 2],
    [9, 4, 3, 2, 1],
    [9, 2, 5, 4, 1],
  ])('%i aptos, N=%i', (aptos, n, times, completos, incompleto) => {
    expect(composicaoVarios(aptos, n)).toEqual({
      times,
      timesCompletos: completos,
      tamanhoTime: n,
      tamanhoIncompleto: incompleto,
    });
  });
});

describe('calcularPrevia: vários times', () => {
  it('válido quando aptos > 2N (mockup: 18 aptos, N=4 → 4 de 4 + 1 de 2)', () => {
    expect(calcularPrevia({ formato: 'varios_times', n: 4, aptos: 18 })).toEqual({
      formato: 'varios_times',
      valida: true,
      times: 5,
      timesCompletos: 4,
      tamanhoTime: 4,
      tamanhoIncompleto: 2,
    });
  });

  it.each([
    [8, 4, 3, true],
    [7, 4, 3, true],
    [5, 3, 2, true],
    [4, 2, null, true],
    [3, 2, null, false],
    [0, 2, null, false],
  ])('insuficiente: %i aptos, N=%i → nSugerido %s', (aptos, n, nSugerido, doisTimesPossivel) => {
    expect(calcularPrevia({ formato: 'varios_times', n, aptos })).toEqual({
      formato: 'varios_times',
      valida: false,
      motivo: 'aptos_insuficientes',
      nSugerido,
      doisTimesPossivel,
    });
  });
});

describe('calcularPrevia: dois times', () => {
  it.each([
    [19, 7, 5],
    [14, 7, 0],
  ])('%i aptos, N=%i → %i reservas', (aptos, n, reservas) => {
    expect(calcularPrevia({ formato: 'dois_times', n, aptos })).toEqual({
      formato: 'dois_times',
      valida: true,
      times: 2,
      reservas,
    });
  });

  it.each([
    [18, 11, 9],
    [19, 11, 9],
    [3, 2, null],
    [0, 2, null],
  ])('insuficiente: %i aptos, N=%i → maior N %s', (aptos, n, maiorNPossivel) => {
    expect(calcularPrevia({ formato: 'dois_times', n, aptos })).toEqual({
      formato: 'dois_times',
      valida: false,
      motivo: 'aptos_insuficientes',
      maiorNPossivel,
    });
  });

  it('a fronteira exata 2N é válida em dois times e inválida em vários', () => {
    expect(calcularPrevia({ formato: 'dois_times', n: 5, aptos: 10 }).valida).toBe(true);
    expect(calcularPrevia({ formato: 'varios_times', n: 5, aptos: 10 }).valida).toBe(false);
  });
});
