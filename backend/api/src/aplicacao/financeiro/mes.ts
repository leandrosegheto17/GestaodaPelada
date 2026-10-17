import { mesFinanceiro, type MesFinanceiro } from '@pelada/contrato';
import {
  compararMeses,
  limitesDeMes,
  mesDentroDosLimites,
  navegacaoDeMes,
  primeiroDia,
  resumoDoMes,
  ultimoDia,
  type LimitesDeMes,
} from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as financeiro from '../../infraestrutura/db/repositorios/financeiro.js';
import { ativosNoMes } from '../elenco/ativos.js';
import { saldoAtualDaConfig } from './saldo-atual.js';

export type ResultadoMesFinanceiro = { tipo: 'ok'; mes: MesFinanceiro } | { tipo: 'fora_dos_limites' };

/**
 * O caixa vai do mês do saldo inicial ao mês de hoje. Se o saldo inicial for datado no futuro, só o mês de
 * hoje existe.
 */
function limitesDoCaixa(dataSaldoInicial: string, hoje: string): LimitesDeMes {
  const limites = limitesDeMes([{ data: dataSaldoInicial }], hoje);
  return limites.primeiro !== null && compararMeses(limites.primeiro, limites.ultimo) > 0
    ? { primeiro: limites.ultimo, ultimo: limites.ultimo }
    : limites;
}

/**
 * Financeiro de um mês: configuração, saldo atual e resumo (do domínio), os ativos no mês com a marcação
 * de pagamento e os lançamentos do mês, cada um com o vínculo. Sem configuração, só a forma vazia.
 */
export async function carregarFinanceiroMes(
  ex: ExecutorDb,
  grupoId: string,
  { mes, hoje }: { mes: string; hoje: string },
): Promise<ResultadoMesFinanceiro> {
  const config = await financeiro.lerConfig(ex, grupoId);
  if (!config) {
    return {
      tipo: 'ok',
      mes: mesFinanceiro.parse({
        mes,
        hoje,
        navegacao: { mesAnterior: null, mesSeguinte: null },
        config: null,
        saldoAtualCentavos: null,
        resumoMes: null,
        pagamentos: [],
        lancamentos: [],
      }),
    };
  }
  const limites = limitesDoCaixa(config.dataSaldoInicial, hoje);
  if (!mesDentroDosLimites(limites, mes)) return { tipo: 'fora_dos_limites' };

  const [ativos, pagamentos, lancamentos, saldo] = await Promise.all([
    ativosNoMes(ex, grupoId, mes),
    financeiro.pagamentosDoMes(ex, grupoId, mes),
    financeiro.lancamentosDoMes(ex, grupoId, primeiroDia(mes), ultimoDia(mes)),
    saldoAtualDaConfig(ex, grupoId, config, hoje),
  ]);
  const pagos = new Set(pagamentos.map((p) => p.jogadorId));
  const resumo = resumoDoMes({
    movimentosDoMes: lancamentos,
    ativosNoMes: ativos.map((j) => j.id),
    pagos: [...pagos],
  });
  return {
    tipo: 'ok',
    mes: mesFinanceiro.parse({
      mes,
      hoje,
      navegacao: navegacaoDeMes(limites, mes),
      config,
      saldoAtualCentavos: saldo,
      resumoMes: resumo,
      pagamentos: ativos.map((j) => ({ jogadorId: j.id, apelido: j.apelido, pagou: pagos.has(j.id) })),
      lancamentos: lancamentos.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        data: l.data,
        descricao: l.descricao,
        valorCentavos: l.valorCentavos,
        mensalidade: l.mensalidade,
      })),
    }),
  };
}
