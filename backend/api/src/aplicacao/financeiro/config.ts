import { compararDatas } from '@pelada/dominio';
import { configFinanceira, type ConfigFinanceira, type ConfigFinanceiraCorpo } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../infraestrutura/db/repositorios/financeiro.js';

export const MSG_SALDO_NO_FUTURO = 'A data do saldo inicial não pode ser no futuro.';

export type ResultadoConfig = { ok: true; config: ConfigFinanceira } | { ok: false; campos: Record<string, string> };

const resumo = (c: financeiro.ConfigFinanceira | null, prefixo: string) => ({
  [`${prefixo}Mensalidade`]: c?.mensalidadeCentavos ?? null,
  [`${prefixo}SaldoInicial`]: c?.saldoInicialCentavos ?? null,
  [`${prefixo}Data`]: c?.dataSaldoInicial ?? null,
});

/**
 * Salva a configuração do caixa (uma por grupo) e audita na mesma transação, com o antes e o depois. Mudar a
 * mensalidade não mexe nos lançamentos de mensalidade já criados.
 */
export async function salvarConfigFinanceira(
  db: Db,
  grupoId: string,
  corpo: ConfigFinanceiraCorpo,
  contexto: { autorContaId: string; hoje: string; agora: Date },
): Promise<ResultadoConfig> {
  if (compararDatas(corpo.dataSaldoInicial, contexto.hoje) > 0) {
    return { ok: false, campos: { dataSaldoInicial: MSG_SALDO_NO_FUTURO } };
  }
  await emTransacao(db, async (tx) => {
    const anterior = await financeiro.salvarConfig(tx, grupoId, corpo);
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: contexto.autorContaId },
      acao: 'financeiro_config_alterada',
      entidade: 'config_financeira',
      entidadeId: grupoId,
      resumo: { ...resumo(anterior, 'antes'), ...resumo(corpo, 'depois') },
      agora: contexto.agora,
    });
  });
  return { ok: true, config: configFinanceira.parse(corpo) };
}
