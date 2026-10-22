import { describe, expect, it } from 'vitest';
import { ativoEm, ativoNoMes, ativosEm, ativosNoMes, situacaoNaRodada, validarPeriodos } from '../../src/index.js';

const entrouNoMeio = [{ inicio: '2026-10-15', fim: null }];
const inativadoEReativado = [
  { inicio: '2026-01-01', fim: '2026-08-10' },
  { inicio: '2026-09-14', fim: null },
];

describe('situacaoNaRodada', () => {
  it('antes da entrada é fora; no dia da entrada, falta', () => {
    expect(situacaoNaRodada(entrouNoMeio, '2026-10-01')).toBe('fora');
    expect(situacaoNaRodada(entrouNoMeio, '2026-10-15')).toBe('falta');
  });
  it('inativação e reativação', () => {
    expect(situacaoNaRodada(inativadoEReativado, '2026-08-09')).toBe('falta');
    expect(situacaoNaRodada(inativadoEReativado, '2026-08-10')).toBe('fora');
    expect(situacaoNaRodada(inativadoEReativado, '2026-09-13')).toBe('fora');
    expect(situacaoNaRodada(inativadoEReativado, '2026-09-14')).toBe('falta');
  });
});

describe('ativo no mês', () => {
  it('conta qualquer dia ativo do mês', () => {
    expect(ativoNoMes(inativadoEReativado, '2026-08')).toBe(true);
    expect(ativoNoMes(inativadoEReativado, '2026-09')).toBe(true);
    expect(ativoNoMes([{ inicio: '2026-01-01', fim: '2026-08-01' }], '2026-08')).toBe(false);
    expect(ativoNoMes(entrouNoMeio, '2026-09')).toBe(false);
  });
  it.each([
    ['2026-08-09', true],
    ['2026-08-10', false],
    ['2026-09-13', false],
    ['2026-09-14', true],
  ])('ativoEm com inativação e reativação em %s -> %s', (data, esperado) => {
    expect(ativoEm(inativadoEReativado, data)).toBe(esperado);
  });
  it('ativoNoMes nas bordas do mês', () => {
    expect(ativoNoMes([{ inicio: '2026-01-01', fim: '2026-08-10' }], '2026-09')).toBe(false);
    expect(ativoNoMes([{ inicio: '2026-01-01', fim: '2026-09-01' }], '2026-09')).toBe(false);
    expect(ativoNoMes([{ inicio: '2026-09-30', fim: null }], '2026-09')).toBe(true);
    expect(ativoNoMes([{ inicio: '2026-10-01', fim: null }], '2026-09')).toBe(false);
  });
  it('filtra jogadores e preserva os campos', () => {
    const js = [
      { apelido: 'A', periodos: entrouNoMeio },
      { apelido: 'B', periodos: [{ inicio: '2026-01-01', fim: '2026-10-15' }] },
    ];
    expect(ativosEm(js, '2026-10-15').map((j) => j.apelido)).toEqual(['A']);
    expect(ativosEm(js, '2026-10-14').map((j) => j.apelido)).toEqual(['B']);
    expect(ativosNoMes(js, '2026-10')).toHaveLength(2);
  });
  it('ativoEm no mesmo dia da troca', () => {
    const ps = [
      { inicio: '2026-01-01', fim: '2026-05-05' },
      { inicio: '2026-05-05', fim: null },
    ];
    expect(ativoEm(ps, '2026-05-05')).toBe(true);
    expect(validarPeriodos(ps)).toEqual({ ok: true });
  });
});

describe('validarPeriodos', () => {
  it('detecta cada erro', () => {
    expect(validarPeriodos([])).toEqual({ ok: true });
    expect(validarPeriodos([{ inicio: '2026-02-01', fim: '2026-01-01' }])).toMatchObject({
      erro: 'saida-antes-da-entrada',
    });
    expect(validarPeriodos([{ inicio: '2026-02-01', fim: '2026-02-01' }])).toEqual({ ok: true });
    expect(
      validarPeriodos([
        { inicio: '2026-01-01', fim: null },
        { inicio: '2026-02-01', fim: null },
      ]),
    ).toMatchObject({ erro: 'mais-de-um-aberto', indice: 1 });
    expect(
      validarPeriodos([
        { inicio: '2026-03-01', fim: null },
        { inicio: '2026-01-01', fim: '2026-03-02' },
      ]),
    ).toMatchObject({ erro: 'sobreposicao', indice: 0 });
  });
  it('aberto seguido de outro período sobrepõe', () => {
    expect(
      validarPeriodos([
        { inicio: '2026-01-01', fim: null },
        { inicio: '2026-05-01', fim: '2026-06-01' },
      ]),
    ).toMatchObject({ ok: false, erro: 'sobreposicao' });
  });
  it('duplicados sobrepõem', () => {
    const p = { inicio: '2026-01-01', fim: '2026-02-01' };
    expect(validarPeriodos([p, p])).toMatchObject({ ok: false, erro: 'sobreposicao' });
  });
  it('desordenados válidos', () => {
    expect(validarPeriodos([...inativadoEReativado].reverse())).toEqual({ ok: true });
  });
});
