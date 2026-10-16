import { describe, expect, it } from 'vitest';
import { nivelDaResposta } from '../../../src/aplicacao/elenco/nivel.js';
import { situacaoAtual } from '../../../src/aplicacao/elenco/situacao.js';

describe('nivelDaResposta', () => {
  it.each([
    [[8, 7, 6, 7, 8, 5], 6.8],
    [[10], 10],
    [[1], 1],
    [[5, 6], 5.5],
    [[1, 2, 2], 1.7],
    [[3, 4, 4, 4, 4, 4, 4, 4], 3.9],
  ])('%j → %d', (notas, esperado) => {
    expect(nivelDaResposta(notas)).toEqual({ nivel: esperado, semNota: false });
  });
  it('sem nota vale 5.5 e marca semNota', () => {
    expect(nivelDaResposta([])).toEqual({ nivel: 5.5, semNota: true });
  });
});

describe('situacaoAtual', () => {
  it('ativo desde o início do período em vigor', () => {
    expect(situacaoAtual([{ inicio: '2026-02-05', fim: null }], '2026-10-22')).toEqual({
      ativo: true,
      desde: '2026-02-05',
    });
  });
  it('inativo desde a saída do último período', () => {
    expect(situacaoAtual([{ inicio: '2026-02-05', fim: '2026-08-10' }], '2026-10-22')).toEqual({
      ativo: false,
      desde: '2026-08-10',
    });
  });
  it('reativado volta a ser ativo desde a nova entrada', () => {
    const periodos = [
      { inicio: '2026-09-14', fim: null },
      { inicio: '2026-02-05', fim: '2026-08-10' },
    ];
    expect(situacaoAtual(periodos, '2026-10-22')).toEqual({ ativo: true, desde: '2026-09-14' });
  });
  it('no dia da saída já está inativo', () => {
    expect(situacaoAtual([{ inicio: '2026-02-05', fim: '2026-10-22' }], '2026-10-22').ativo).toBe(false);
  });
});
