import { describe, expect, it } from 'vitest';
import { PESOS_PADRAO, configVigente, criarResolvedorDePesos } from './pesos.js';
import { acumuladoAte, pontosDaPresenca, pontosNaData } from './pontos.js';
import type { ConfigPesos, PresencaDoJogador } from './tipos.js';

const antiga: ConfigPesos = { ...PESOS_PADRAO, vigenteDesde: '2026-02-05', registradoEm: '2026-02-05T10:00:00Z' };
const nova: ConfigPesos = {
  ...PESOS_PADRAO,
  presencaComChuva: 2,
  vigenteDesde: '2026-09-01',
  registradoEm: '2026-08-30T10:00:00Z',
};

describe('pontosDaPresenca com pesos padrão', () => {
  it.each([
    ['presente', false, 1],
    ['presente', true, 1],
    ['lesionado', false, 1],
    ['lesionado', true, 1],
    ['expulso', false, -1],
    ['expulso', true, -1],
  ] as const)('%s chuva=%s = %i', (situacao, choveu, esperado) => {
    expect(pontosDaPresenca(situacao, choveu, PESOS_PADRAO)).toBe(esperado);
  });

  it('expulso ignora a chuva mesmo com pesos distintos', () => {
    const pesos = { ...PESOS_PADRAO, presencaComChuva: 5, expulso: -3 };
    expect(pontosDaPresenca('expulso', true, pesos)).toBe(-3);
    expect(pontosDaPresenca('expulso', false, pesos)).toBe(-3);
  });
});

describe('vigência dos pesos', () => {
  const configs = [antiga, nova];
  it.each([
    ['2026-08-27', 1],
    ['2026-08-31', 1],
    ['2026-09-01', 2],
    ['2026-10-08', 2],
  ])('presença com chuva em %s = %i', (data, esperado) => {
    expect(pontosNaData('presente', true, data, configs)).toBe(esperado);
  });

  it('data anterior à primeira configuração usa a mais antiga', () => {
    expect(configVigente(configs, '2026-01-20')).toBe(antiga);
  });

  it('empate no mesmo dia: vale o registrado por último, em qualquer ordem', () => {
    const a: ConfigPesos = { ...antiga, vigenteDesde: '2026-09-01', registradoEm: '2026-08-01T00:00:00Z' };
    const b: ConfigPesos = { ...a, presencaSemChuva: 3, registradoEm: '2026-08-02T00:00:00Z' };
    expect(configVigente([a, b], '2026-09-01')).toBe(b);
    expect(configVigente([b, a], '2026-09-01')).toBe(b);
  });

  it('ordem do array não altera o resultado', () => {
    expect(configVigente([nova, antiga], '2026-08-27')).toBe(antiga);
    expect(configVigente([nova, antiga], '2026-09-02')).toBe(nova);
  });

  it('sem configurações é erro', () => {
    expect(() => criarResolvedorDePesos([])).toThrow();
  });

  it('aceita resolvedor já criado', () => {
    const r = criarResolvedorDePesos([antiga, nova]);
    expect(pontosNaData('presente', true, '2026-09-10', r)).toBe(2);
  });
});

describe('acumuladoAte', () => {
  const presencas: PresencaDoJogador[] = [
    { data: '2026-08-27', choveu: true, situacao: 'presente' }, // 1
    { data: '2026-08-31', choveu: false, situacao: 'lesionado' }, // 1
    { data: '2026-09-01', choveu: true, situacao: 'presente' }, // 2
    { data: '2026-10-08', choveu: true, situacao: 'expulso' }, // -1
  ];
  const configs = [antiga, nova];

  it('referência antes da 1ª partida = 0', () => {
    expect(acumuladoAte(presencas, configs, '2026-08-26')).toBe(0);
  });
  it('referência no dia da partida a inclui', () => {
    expect(acumuladoAte(presencas, configs, '2026-08-27')).toBe(1);
    expect(acumuladoAte(presencas, configs, '2026-09-01')).toBe(4);
  });
  it('troca de pesos não muda partidas anteriores', () => {
    expect(acumuladoAte(presencas, configs, '2026-08-31')).toBe(2);
    expect(acumuladoAte(presencas, [antiga], '2026-08-31')).toBe(2);
    expect(acumuladoAte(presencas, configs, '2026-10-08')).toBe(3);
  });
  it('lista vazia = 0', () => {
    expect(acumuladoAte([], configs, '2026-10-08')).toBe(0);
  });
  it('acumulado negativo possível', () => {
    const so: PresencaDoJogador[] = [
      { data: '2026-03-01', choveu: false, situacao: 'expulso' },
      { data: '2026-03-08', choveu: true, situacao: 'expulso' },
    ];
    expect(acumuladoAte(so, configs, '2026-12-31')).toBe(-2);
  });
});
