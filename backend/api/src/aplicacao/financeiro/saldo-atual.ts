import { intervaloDoSaldo, saldoAtual } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as financeiro from '../../infraestrutura/db/repositorios/financeiro.js';

/** Saldo atual do caixa com a configuração já lida: a soma de lançamentos é no banco, a conta é do domínio. */
export async function saldoAtualDaConfig(
  ex: ExecutorDb,
  grupoId: string,
  config: financeiro.ConfigFinanceira,
  hoje: string,
): Promise<number> {
  const intervalo = intervaloDoSaldo(config, hoje);
  const totais = intervalo ? await financeiro.totaisEntre(ex, grupoId, intervalo.desde, intervalo.ate) : null;
  return saldoAtual(config, totais);
}

/** Saldo atual em centavos, ou `null` se o caixa ainda não foi configurado. */
export async function carregarSaldoAtual(ex: ExecutorDb, grupoId: string, hoje: string): Promise<number | null> {
  const config = await financeiro.lerConfig(ex, grupoId);
  return config ? saldoAtualDaConfig(ex, grupoId, config, hoje) : null;
}
