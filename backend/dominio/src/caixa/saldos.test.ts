import { describe, expect, it } from 'vitest';
import { intervaloDoSaldo, resumoDoMes, saldoAtual, totais, type ConfigCaixa, type MovimentoCaixa } from './saldos.js';

const config: ConfigCaixa = { mensalidadeCentavos: 5000, saldoInicialCentavos: 35000, dataSaldoInicial: '2026-02-05' };
const mov = (tipo: 'entrada' | 'saida', data: string, valorCentavos: number): MovimentoCaixa => ({ tipo, data, valorCentavos });

/** Aplica o intervalo como o SQL do repositório faria. */
function saldoPelosMovimentos(movs: MovimentoCaixa[], hoje: string): number {
  const iv = intervaloDoSaldo(config, hoje);
  const dentro = iv ? movs.filter((m) => m.data >= iv.desde && m.data <= iv.ate) : [];
  return saldoAtual(config, iv ? totais(dentro) : null);
}

describe('intervaloDoSaldo e saldoAtual', () => {
  it('soma entradas e subtrai saídas desde a data do saldo inicial', () => {
    const movs = [mov('entrada', '2026-02-05', 5000), mov('saida', '2026-03-01', 12000), mov('entrada', '2026-10-01', 10000)];
    expect(saldoPelosMovimentos(movs, '2026-10-17')).toBe(35000 + 15000 - 12000);
  });
  it('lançamento no dia do saldo inicial entra; dia anterior e depois de hoje não', () => {
    expect(saldoPelosMovimentos([mov('entrada', '2026-02-05', 100)], '2026-10-17')).toBe(35100);
    expect(saldoPelosMovimentos([mov('entrada', '2026-02-04', 100)], '2026-10-17')).toBe(35000);
    expect(saldoPelosMovimentos([mov('entrada', '2026-10-18', 100)], '2026-10-17')).toBe(35000);
  });
  it('hoje antes da data do saldo inicial: intervalo nulo e saldo = inicial', () => {
    expect(intervaloDoSaldo(config, '2026-02-04')).toBeNull();
    expect(intervaloDoSaldo(config, '2026-02-05')).toEqual({ desde: '2026-02-05', ate: '2026-02-05' });
    expect(saldoAtual(config, null)).toBe(35000);
  });
  it('saldo pode ficar negativo', () => {
    expect(saldoAtual(config, { entradasCentavos: 0, saidasCentavos: 40000 })).toBe(-5000);
  });
  it('estouro lança erro', () => {
    const max = Number.MAX_SAFE_INTEGER;
    expect(() => saldoAtual(config, { entradasCentavos: max, saidasCentavos: 0 })).toThrow(RangeError);
    expect(() => totais([mov('entrada', '2026-10-01', max), mov('entrada', '2026-10-02', 1)])).toThrow(RangeError);
  });
});

describe('resumoDoMes', () => {
  it('só saídas dá resultado negativo', () => {
    const r = resumoDoMes({ movimentosDoMes: [mov('saida', '2026-10-03', 8000)], ativosNoMes: ['a'], pagos: ['a'] });
    expect(r).toEqual({ entradasCentavos: 0, saidasCentavos: 8000, resultadoCentavos: -8000, naoPagaram: 0 });
  });
  it('mês vazio: zeros e naoPagaram = nº de ativos', () => {
    const r = resumoDoMes({ movimentosDoMes: [], ativosNoMes: ['a', 'b', 'c'], pagos: [] });
    expect(r).toEqual({ entradasCentavos: 0, saidasCentavos: 0, resultadoCentavos: 0, naoPagaram: 3 });
  });
  it('pago que não é ativo no mês não muda naoPagaram', () => {
    const r = resumoDoMes({ movimentosDoMes: [], ativosNoMes: ['a', 'b'], pagos: ['a', 'z'] });
    expect(r.naoPagaram).toBe(1);
  });
  it('virada de ano e totais mistos', () => {
    const r = resumoDoMes({
      movimentosDoMes: [mov('entrada', '2027-01-02', 5000), mov('entrada', '2027-01-31', 5000), mov('saida', '2027-01-15', 3000)],
      ativosNoMes: ['a', 'b'],
      pagos: ['a', 'b'],
    });
    expect(r).toEqual({ entradasCentavos: 10000, saidasCentavos: 3000, resultadoCentavos: 7000, naoPagaram: 0 });
  });
});
