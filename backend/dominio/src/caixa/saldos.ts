import { compararDatas, type Data } from '../datas/datas.js';

/** Configuração do caixa, em centavos inteiros. */
export interface ConfigCaixa {
  mensalidadeCentavos: number | null;
  saldoInicialCentavos: number;
  dataSaldoInicial: Data;
}

export interface Totais {
  entradasCentavos: number;
  saidasCentavos: number;
}

export interface MovimentoCaixa {
  tipo: 'entrada' | 'saida';
  data: Data;
  valorCentavos: number;
}

export interface ResumoDoMes extends Totais {
  resultadoCentavos: number;
  /** Ativos no mês sem pagamento marcado. */
  naoPagaram: number;
}

/** Soma que não arredonda nem passa em silêncio do limite: estouro é erro. */
function somar(a: number, b: number): number {
  const total = a + b;
  if (!Number.isSafeInteger(total)) throw new RangeError('Valor do caixa fora do limite seguro.');
  return total;
}

/**
 * Intervalo em que os lançamentos contam para o saldo atual: do dia do saldo inicial (inclusive, o saldo é
 * o do começo do dia) até hoje. `null` quando hoje é anterior à data do saldo inicial.
 */
export function intervaloDoSaldo(config: ConfigCaixa, hoje: Data): { desde: Data; ate: Data } | null {
  return compararDatas(hoje, config.dataSaldoInicial) < 0 ? null : { desde: config.dataSaldoInicial, ate: hoje };
}

/** Saldo atual = saldo inicial + entradas − saídas do intervalo; sem intervalo, só o saldo inicial. */
export function saldoAtual(config: ConfigCaixa, totaisNoIntervalo: Totais | null): number {
  if (totaisNoIntervalo === null) return config.saldoInicialCentavos;
  return somar(
    somar(config.saldoInicialCentavos, totaisNoIntervalo.entradasCentavos),
    -totaisNoIntervalo.saidasCentavos,
  );
}

export function totais(movimentos: readonly MovimentoCaixa[]): Totais {
  let entradasCentavos = 0;
  let saidasCentavos = 0;
  for (const m of movimentos) {
    if (m.tipo === 'entrada') entradasCentavos = somar(entradasCentavos, m.valorCentavos);
    else saidasCentavos = somar(saidasCentavos, m.valorCentavos);
  }
  return { entradasCentavos, saidasCentavos };
}

/**
 * Resumo do mês: totais, resultado (entradas − saídas) e quantos ativos no mês ainda não pagaram. Pagamento
 * de quem não era ativo no mês não desconta de "não pagaram".
 */
export function resumoDoMes(entrada: {
  movimentosDoMes: readonly MovimentoCaixa[];
  ativosNoMes: readonly string[];
  pagos: readonly string[];
}): ResumoDoMes {
  const { entradasCentavos, saidasCentavos } = totais(entrada.movimentosDoMes);
  const pagos = new Set(entrada.pagos);
  const ativos = [...new Set(entrada.ativosNoMes)];
  return {
    entradasCentavos,
    saidasCentavos,
    resultadoCentavos: somar(entradasCentavos, -saidasCentavos),
    naoPagaram: ativos.filter((id) => !pagos.has(id)).length,
  };
}
