import { describe, expect, it } from 'vitest';
import {
  compararDatas,
  compararMeses,
  diaDaSemana,
  mesAnterior,
  mesDe,
  mesSeguinte,
  primeiroDia,
  somarDias,
  ultimoDia,
} from '../../src/index.js';

describe('mês', () => {
  it('mesDe e primeiroDia', () => {
    expect(mesDe('2026-10-22')).toBe('2026-10');
    expect(primeiroDia('2026-10')).toBe('2026-10-01');
  });
  it.each([
    ['2026-02', '2026-02-28'],
    ['2028-02', '2028-02-29'],
    ['2100-02', '2100-02-28'],
    ['2000-02', '2000-02-29'],
    ['2026-12', '2026-12-31'],
    ['2026-04', '2026-04-30'],
  ])('ultimoDia(%s) = %s', (mes, esperado) => expect(ultimoDia(mes)).toBe(esperado));
  it('vira o ano', () => {
    expect(mesAnterior('2026-01')).toBe('2025-12');
    expect(mesSeguinte('2026-12')).toBe('2027-01');
    expect(mesAnterior('2026-03')).toBe('2026-02');
    expect(mesSeguinte('2026-09')).toBe('2026-10');
  });
});

describe('somarDias', () => {
  it.each([
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-10-22', 0, '2026-10-22'],
    ['2026-10-22', -7, '2026-10-15'],
  ])('%s %i → %s', (data, n, esperado) => expect(somarDias(data, n)).toBe(esperado));
});

describe('diaDaSemana e comparações', () => {
  it('quinta = 4, 29/02/2028 = terça', () => {
    expect(diaDaSemana('2026-10-22')).toBe(4);
    expect(diaDaSemana('2028-02-29')).toBe(2);
  });
  it('compara datas e meses', () => {
    expect(compararDatas('2026-10-22', '2026-10-23')).toBeLessThan(0);
    expect(compararDatas('2026-10-22', '2026-10-22')).toBe(0);
    expect(compararMeses('2027-01', '2026-12')).toBeGreaterThan(0);
  });
});
