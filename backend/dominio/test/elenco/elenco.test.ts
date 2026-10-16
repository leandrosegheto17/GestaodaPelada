import { describe, expect, it } from 'vitest';
import { HABILIDADES_INICIAIS, NIVEL_SEM_NOTA, calcularIdade, calcularNivel } from '../../src/index.js';

describe('calcularNivel', () => {
  it.each([
    [[8, 7, 6, 7, 8, 5], 683],
    [[10], 1000],
    [[1], 100],
    [[5, 6], 550],
    [[1, 2, 2], 167],
    [[7, 8, 8], 767],
    [[3, 4, 4, 4, 4, 4, 4, 4], 388],
  ])('%j → %i', (notas, esperado) => {
    expect(calcularNivel(notas)).toEqual({ nivel: esperado, semNota: false });
  });

  it('sem nota vale 550 e marca semNota', () => {
    expect(calcularNivel([])).toEqual({ nivel: NIVEL_SEM_NOTA, semNota: true });
    expect(NIVEL_SEM_NOTA).toBe(550);
  });
});

describe('calcularIdade', () => {
  it.each([
    [1978, '2026-10-22', 48],
    [1978, '2026-01-01', 48],
    [2016, '2026-12-31', 10],
  ])('%i em %s = %i', (ano, hoje, esperado) => {
    expect(calcularIdade(ano, hoje)).toBe(esperado);
  });
});

describe('HABILIDADES_INICIAIS', () => {
  it('são as 6 da RN-18, na ordem', () => {
    expect(HABILIDADES_INICIAIS).toEqual(['Visão de Jogo', 'Passe', 'Preparo Físico', 'Drible', 'Chute', 'Desarme']);
  });
});
