import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EntradaPrevia } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import {
  descreverDois,
  descreverDoisInsuficiente,
  descreverVarios,
  descreverVariosInsuficiente,
} from '../../../src/aplicacao/simulador/descricao.js';
import { montarPrevia } from '../../../src/aplicacao/simulador/previa.js';

const RESPOSTAS = join(import.meta.dirname, '../../../../../.md/mockup/respostas');
const arquivo = (nome: string): unknown => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8'));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const dois = (quantos: number, n: number): EntradaPrevia => ({
  formato: 'dois_times',
  n,
  k: 2,
  aptos: Array.from({ length: quantos }, (_, i) => ({ id: id(i + 1), so1oTempo: false })),
});
const varios = (quantos: number, n: number): EntradaPrevia => ({
  formato: 'varios_times',
  n,
  aptos: Array.from({ length: quantos }, (_, i) => ({ id: id(i + 1) })),
});

describe('montarPrevia: formas do mockup', () => {
  it('19 aptos, dois times, N=7', () => {
    expect(montarPrevia(dois(19, 7))).toEqual(arquivo('simulador-previa-dois.json'));
  });
  it('18 aptos, vários times, N=4', () => {
    expect(montarPrevia(varios(18, 4))).toEqual(arquivo('simulador-previa-varios.json'));
  });
  it('18 aptos, dois times, N=11', () => {
    expect(montarPrevia(dois(18, 11))).toEqual(arquivo('simulador-previa-insuficiente.json'));
  });
});

describe('montarPrevia: bordas', () => {
  it('vários com 8 aptos e N=4: inválido com o texto da tela', () => {
    expect(montarPrevia(varios(8, 4))).toMatchObject({
      valida: false,
      motivo: 'aptos_insuficientes',
      descricao: 'Com 8 aptos e N = 4 não há 3 times. Use N menor ou o formato 2 times.',
      nSugerido: 3,
    });
  });

  it('a fronteira 2N vale em dois times e não em vários', () => {
    expect(montarPrevia(dois(10, 5)).valida).toBe(true);
    expect(montarPrevia(varios(10, 5)).valida).toBe(false);
    expect(montarPrevia(varios(11, 5)).valida).toBe(true);
  });
});

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
