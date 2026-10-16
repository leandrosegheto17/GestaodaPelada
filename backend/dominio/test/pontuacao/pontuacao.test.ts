import { describe, expect, it } from 'vitest';
import {
  PESOS_PADRAO,
  acumuladoAte,
  configVigente,
  pontosDaPresenca,
  pontosNaData,
  type ConfigPesos,
} from '../../src/index.js';

const antiga: ConfigPesos = {
  ...PESOS_PADRAO,
  vigenteDesde: '2026-02-05',
  registradoEm: '2026-02-05T10:00',
};
const nova: ConfigPesos = {
  ...PESOS_PADRAO,
  presencaComChuva: 2,
  vigenteDesde: '2026-09-01',
  registradoEm: '2026-08-30T10:00',
};

describe('pontosDaPresenca com pesos padrão', () => {
  it.each([
    ['presente', false, 1],
    ['presente', true, 1],
    ['lesionado', false, 1],
    ['lesionado', true, 1],
    ['expulso', false, -1],
    ['expulso', true, -1],
  ] as const)('%s chuva=%s → %i', (situacao, choveu, esperado) => {
    expect(pontosDaPresenca(situacao, choveu, PESOS_PADRAO)).toBe(esperado);
  });
});

describe('vigência dos pesos', () => {
  it('partida antes da troca usa a config antiga; no dia da troca, a nova', () => {
    const configs = [antiga, nova];
    expect(pontosNaData('presente', true, '2026-08-27', configs)).toBe(1);
    expect(pontosNaData('presente', true, '2026-09-01', configs)).toBe(2);
    expect(pontosNaData('presente', true, '2026-10-08', configs)).toBe(2);
  });
  it('data anterior à primeira config usa a mais antiga', () => {
    expect(configVigente([antiga, nova], '2026-01-20')).toBe(antiga);
  });
  it('empate no mesmo dia: vale a registrada por último, em qualquer ordem', () => {
    const a = { ...antiga, vigenteDesde: '2026-09-01', registradoEm: '2026-09-01T08:00' };
    const b = { ...nova, registradoEm: '2026-09-01T09:00' };
    expect(configVigente([a, b], '2026-09-02')).toBe(b);
    expect(configVigente([b, a], '2026-09-02')).toBe(b);
  });
  it('sem configurações é erro de domínio', () => {
    expect(() => configVigente([], '2026-09-02')).toThrow();
  });
});

describe('acumuladoAte', () => {
  const presencas = [
    { data: '2026-08-27', choveu: true, situacao: 'presente' as const },
    { data: '2026-09-03', choveu: true, situacao: 'presente' as const },
    { data: '2026-09-10', choveu: false, situacao: 'expulso' as const },
  ];
  it('referência antes da primeira partida = 0', () => {
    expect(acumuladoAte(presencas, [antiga, nova], '2026-08-01')).toBe(0);
  });
  it('inclui a partida do dia da referência', () => {
    expect(acumuladoAte(presencas, [antiga, nova], '2026-08-27')).toBe(1);
  });
  it('a troca de pesos não muda as partidas anteriores', () => {
    expect(acumuladoAte(presencas, [antiga], '2026-08-27')).toBe(
      acumuladoAte(presencas, [antiga, nova], '2026-08-27'),
    );
    expect(acumuladoAte(presencas, [antiga, nova], '2026-09-10')).toBe(1 + 2 - 1);
  });
  it('lista vazia = 0 e acumulado pode ser negativo', () => {
    expect(acumuladoAte([], [antiga], '2026-10-01')).toBe(0);
    const so = [{ data: '2026-09-10', choveu: false, situacao: 'expulso' as const }];
    expect(acumuladoAte(so, [antiga], '2026-10-01')).toBe(-1);
  });
});
