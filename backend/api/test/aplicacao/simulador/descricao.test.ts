import { describe, expect, it } from 'vitest';
import {
  descreverDois,
  descreverDoisInsuficiente,
  descreverVarios,
  descreverVariosInsuficiente,
} from '../../../src/aplicacao/simulador/descricao.js';

describe('descrições', () => {
  it.each([
    [7, 0, '2 times de 7'],
    [7, 1, '2 times de 7 · 1 reserva'],
    [7, 5, '2 times de 7 · 5 reservas'],
  ])('dois: N=%i, %i reservas', (n, reservas, texto) => {
    expect(descreverDois(n, reservas)).toBe(texto);
  });

  it.each([
    [{ timesCompletos: 5, tamanhoTime: 4, tamanhoIncompleto: 0 }, '5 times de 4'],
    [{ timesCompletos: 2, tamanhoTime: 4, tamanhoIncompleto: 1 }, '2 times de 4 + 1 time incompleto de 1'],
  ])('vários %j', (composicao, texto) => {
    expect(descreverVarios(composicao)).toBe(texto);
  });

  it('insuficientes, com e sem saída', () => {
    expect(descreverDoisInsuficiente(11, 9)).toBe('Faltam aptos para 2 times de 11. Maior N possível: 9.');
    expect(descreverDoisInsuficiente(2, null)).toBe('Faltam aptos para 2 times.');
    expect(descreverVariosInsuficiente(3, 2, { nMenor: false, doisTimes: false })).toBe(
      'Com 3 aptos e N = 2 não há 3 times.',
    );
    expect(descreverVariosInsuficiente(4, 2, { nMenor: false, doisTimes: true })).toBe(
      'Com 4 aptos e N = 2 não há 3 times. Use o formato 2 times.',
    );
  });
});
