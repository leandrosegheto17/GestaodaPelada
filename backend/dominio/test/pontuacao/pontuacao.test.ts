import { describe, expect, it } from 'vitest';
import {
  PESOS_PADRAO,
  acumuladoAte,
  configVigente,
  criarResolvedorDePesos,
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

  it('expulso ignora a chuva mesmo com pesos distintos', () => {
    const pesos = { ...PESOS_PADRAO, presencaComChuva: 5, expulso: -3 };
    expect(pontosDaPresenca('expulso', true, pesos)).toBe(-3);
    expect(pontosDaPresenca('expulso', false, pesos)).toBe(-3);
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
  it('ordem do array não altera o resultado', () => {
    expect(configVigente([nova, antiga], '2026-08-27')).toBe(antiga);
    expect(configVigente([nova, antiga], '2026-09-02')).toBe(nova);
  });
  it('aceita resolvedor já criado', () => {
    const resolvedor = criarResolvedorDePesos([antiga, nova]);
    expect(pontosNaData('presente', true, '2026-09-10', resolvedor)).toBe(2);
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
    expect(acumuladoAte(presencas, [antiga], '2026-08-27')).toBe(acumuladoAte(presencas, [antiga, nova], '2026-08-27'));
    expect(acumuladoAte(presencas, [antiga, nova], '2026-09-10')).toBe(1 + 2 - 1);
  });
  it('lista vazia = 0 e acumulado pode ser negativo', () => {
    expect(acumuladoAte([], [antiga], '2026-10-01')).toBe(0);
    const so = [{ data: '2026-09-10', choveu: false, situacao: 'expulso' as const }];
    expect(acumuladoAte(so, [antiga], '2026-10-01')).toBe(-1);
  });
  it('acumulado negativo com duas expulsões (sem e com chuva)', () => {
    const so = [
      { data: '2026-03-01', choveu: false, situacao: 'expulso' as const },
      { data: '2026-03-08', choveu: true, situacao: 'expulso' as const },
    ];
    expect(acumuladoAte(so, [antiga, nova], '2026-12-31')).toBe(-2);
  });

  describe('massa com lesionado em 2026-08-31 e expulso em 2026-10-08', () => {
    const presencasMistas = [
      { data: '2026-08-27', choveu: true, situacao: 'presente' as const },
      { data: '2026-08-31', choveu: false, situacao: 'lesionado' as const },
      { data: '2026-09-01', choveu: true, situacao: 'presente' as const },
      { data: '2026-10-08', choveu: true, situacao: 'expulso' as const },
    ];
    it('troca de pesos não muda partidas anteriores (2026-08-31 e 2026-10-08)', () => {
      expect(acumuladoAte(presencasMistas, [antiga, nova], '2026-08-31')).toBe(2);
      expect(acumuladoAte(presencasMistas, [antiga], '2026-08-31')).toBe(2);
      expect(acumuladoAte(presencasMistas, [antiga, nova], '2026-10-08')).toBe(3);
    });
  });
});
