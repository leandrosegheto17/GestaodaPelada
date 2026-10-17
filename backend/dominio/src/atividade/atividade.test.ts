import { describe, expect, it } from 'vitest';
import { ativoEm, ativoNoMes, ativosEm, ativosNoMes, type Periodo } from './atividade.js';
import { situacaoNaRodada } from './situacao-rodada.js';
import { validarPeriodos } from './validar-periodos.js';

const entrouNoMeio: Periodo[] = [{ inicio: '2026-10-15', fim: null }];
const reativado: Periodo[] = [
  { inicio: '2026-01-01', fim: '2026-08-10' },
  { inicio: '2026-09-14', fim: null },
];

describe('situacaoNaRodada', () => {
  it.each([
    ['2026-10-01', undefined, 'fora'],
    ['2026-10-08', undefined, 'fora'],
    ['2026-10-15', undefined, 'falta'],
    ['2026-10-15', 'presente', 'presente'],
    ['2026-10-15', 'lesionado', 'lesionado'],
    ['2026-10-08', 'presente', 'fora'],
  ])('entrada no meio do mês: %s com %s -> %s', (data, situacao, esperado) => {
    expect(situacaoNaRodada(entrouNoMeio, data, situacao)).toBe(esperado);
  });
});

describe('ativoEm / ativoNoMes', () => {
  it.each([
    ['2026-08-09', true],
    ['2026-08-10', false],
    ['2026-09-13', false],
    ['2026-09-14', true],
  ])('inativação e reativação em %s -> %s', (data, esperado) => {
    expect(ativoEm(reativado, data)).toBe(esperado);
  });

  it('ativoNoMes', () => {
    expect(ativoNoMes(reativado, '2026-08')).toBe(true);
    expect(ativoNoMes(reativado, '2026-09')).toBe(true);
    expect(ativoNoMes([{ inicio: '2026-01-01', fim: '2026-08-10' }], '2026-09')).toBe(false);
    expect(ativoNoMes([{ inicio: '2026-01-01', fim: '2026-09-01' }], '2026-09')).toBe(false);
    expect(ativoNoMes([{ inicio: '2026-09-30', fim: null }], '2026-09')).toBe(true);
    expect(ativoNoMes([{ inicio: '2026-10-01', fim: null }], '2026-09')).toBe(false);
  });

  it('inativar e reativar no mesmo dia', () => {
    const p: Periodo[] = [
      { inicio: '2026-01-01', fim: '2026-05-05' },
      { inicio: '2026-05-05', fim: null },
    ];
    expect(validarPeriodos(p)).toEqual({ ok: true });
    expect(ativoEm(p, '2026-05-05')).toBe(true);
  });

  it('ativosEm inclui o dia da entrada e exclui o da saída; preserva campos', () => {
    const js = [
      { id: 'a', periodos: [{ inicio: '2026-10-15', fim: null }] },
      { id: 'b', periodos: [{ inicio: '2026-01-01', fim: '2026-10-15' }] },
    ];
    expect(ativosEm(js, '2026-10-15').map((j) => j.id)).toEqual(['a']);
    expect(ativosNoMes(js, '2026-10').map((j) => j.id)).toEqual(['a', 'b']);
  });
});

describe('validarPeriodos', () => {
  it('lista vazia é válida', () => expect(validarPeriodos([])).toEqual({ ok: true }));
  it('fim = inicio aceito', () =>
    expect(validarPeriodos([{ inicio: '2026-01-01', fim: '2026-01-01' }])).toEqual({ ok: true }));
  it('fim antes do início', () =>
    expect(validarPeriodos([{ inicio: '2026-02-01', fim: '2026-01-01' }])).toEqual({
      ok: false,
      erro: 'saida-antes-da-entrada',
      indice: 0,
    }));
  it('dois abertos', () =>
    expect(
      validarPeriodos([
        { inicio: '2026-01-01', fim: null },
        { inicio: '2026-02-01', fim: null },
      ]),
    ).toMatchObject({ ok: false, erro: 'mais-de-um-aberto', indice: 1 }));
  it('sobreposição, com ordem embaralhada', () =>
    expect(
      validarPeriodos([
        { inicio: '2026-03-01', fim: '2026-04-01' },
        { inicio: '2026-01-01', fim: '2026-03-02' },
      ]),
    ).toEqual({ ok: false, erro: 'sobreposicao', indice: 0 }));
  it('aberto seguido de outro período sobrepõe', () =>
    expect(
      validarPeriodos([
        { inicio: '2026-01-01', fim: null },
        { inicio: '2026-05-01', fim: '2026-06-01' },
      ]),
    ).toMatchObject({ ok: false, erro: 'sobreposicao' }));
  it('duplicados sobrepõem', () => {
    const p = { inicio: '2026-01-01', fim: '2026-02-01' };
    expect(validarPeriodos([p, p])).toMatchObject({ ok: false, erro: 'sobreposicao' });
  });
  it('desordenados válidos', () =>
    expect(
      validarPeriodos([
        { inicio: '2026-09-14', fim: null },
        { inicio: '2026-01-01', fim: '2026-08-10' },
      ]),
    ).toEqual({ ok: true }));
});
