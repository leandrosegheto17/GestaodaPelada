import { describe, expect, it } from 'vitest';
import {
  entradaDaMensalidade,
  intervaloDoSaldo,
  resumoDoMes,
  saldoAtual,
  totais,
  type ConfigCaixa,
  type MovimentoCaixa,
} from '../../src/index.js';

const config: ConfigCaixa = { mensalidadeCentavos: 7500, saldoInicialCentavos: 35000, dataSaldoInicial: '2026-02-05' };
const mov = (tipo: 'entrada' | 'saida', data: string, valorCentavos: number): MovimentoCaixa => ({
  tipo,
  data,
  valorCentavos,
});

describe('intervaloDoSaldo e saldoAtual', () => {
  it('o intervalo vai do dia do saldo inicial (inclusive) até hoje', () => {
    expect(intervaloDoSaldo(config, '2026-10-22')).toEqual({ desde: '2026-02-05', ate: '2026-10-22' });
    expect(intervaloDoSaldo(config, '2026-02-05')).toEqual({ desde: '2026-02-05', ate: '2026-02-05' });
  });

  it('hoje antes da data do saldo inicial: sem intervalo e saldo = saldo inicial', () => {
    expect(intervaloDoSaldo(config, '2026-02-04')).toBeNull();
    expect(saldoAtual(config, null)).toBe(35000);
  });

  it('saldo inicial + entradas − saídas, inclusive negativo', () => {
    expect(saldoAtual(config, { entradasCentavos: 200000, saidasCentavos: 110450 })).toBe(124550);
    expect(saldoAtual(config, { entradasCentavos: 0, saidasCentavos: 50000 })).toBe(-15000);
  });

  it('estouro do limite seguro é erro, não arredondamento', () => {
    expect(() =>
      saldoAtual(
        { ...config, saldoInicialCentavos: Number.MAX_SAFE_INTEGER },
        { entradasCentavos: 1, saidasCentavos: 0 },
      ),
    ).toThrow(RangeError);
  });
});

describe('totais e resumoDoMes', () => {
  it('soma entradas e saídas em centavos inteiros', () => {
    expect(
      totais([
        mov('entrada', '2026-10-01', 7500),
        mov('saida', '2026-10-05', 80000),
        mov('entrada', '2026-10-02', 7500),
      ]),
    ).toEqual({
      entradasCentavos: 15000,
      saidasCentavos: 80000,
    });
  });

  it('só saídas: resultado negativo', () => {
    const r = resumoDoMes({ movimentosDoMes: [mov('saida', '2026-10-05', 80000)], ativosNoMes: ['a', 'b'], pagos: [] });
    expect(r).toEqual({ entradasCentavos: 0, saidasCentavos: 80000, resultadoCentavos: -80000, naoPagaram: 2 });
  });

  it('mês vazio: zeros e todos os ativos sem pagar', () => {
    expect(resumoDoMes({ movimentosDoMes: [], ativosNoMes: ['a', 'b', 'c'], pagos: [] })).toEqual({
      entradasCentavos: 0,
      saidasCentavos: 0,
      resultadoCentavos: 0,
      naoPagaram: 3,
    });
  });

  it('pagamento de quem não era ativo no mês não desconta; repetidos contam uma vez', () => {
    const r = resumoDoMes({ movimentosDoMes: [], ativosNoMes: ['a', 'b', 'a'], pagos: ['a', 'x', 'a'] });
    expect(r.naoPagaram).toBe(1);
  });

  it('virada de ano não muda a conta', () => {
    const r = resumoDoMes({
      movimentosDoMes: [mov('entrada', '2026-12-31', 100), mov('saida', '2026-12-01', 40)],
      ativosNoMes: [],
      pagos: [],
    });
    expect(r.resultadoCentavos).toBe(60);
  });
});

describe('entradaDaMensalidade', () => {
  const base = { apelido: 'Toninho', mes: '2026-10', mensalidadeCentavos: 7500, hoje: '2026-10-22' };

  it('descrição "Mensalidade <apelido> <mm/aaaa>", valor da mensalidade e data de hoje', () => {
    expect(entradaDaMensalidade(base)).toEqual({
      tipo: 'entrada',
      data: '2026-10-22',
      descricao: 'Mensalidade Toninho 10/2026',
      valorCentavos: 7500,
    });
  });

  it('mês com zero à esquerda e apelido acentuado de 30 caracteres cabem em 80', () => {
    const apelido = 'Zé'.padEnd(30, 'ã');
    const r = entradaDaMensalidade({ ...base, apelido, mes: '2026-01' });
    expect(r?.descricao).toBe(`Mensalidade ${apelido} 01/2026`);
    expect(r?.descricao.length).toBeLessThanOrEqual(80);
  });

  it('sem mensalidade configurada, só a marcação vale', () => {
    expect(entradaDaMensalidade({ ...base, mensalidadeCentavos: null })).toBeNull();
  });
});
