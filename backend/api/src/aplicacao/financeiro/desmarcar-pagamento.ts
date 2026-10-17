import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../infraestrutura/db/repositorios/financeiro.js';

/**
 * Desmarca o pagamento e apaga o lançamento de entrada vinculado, com auditoria, tudo numa transação.
 * `false` se o jogador não tinha pagamento marcado naquele mês (nada é tocado).
 */
export async function desmarcarPagamento(
  db: Db,
  grupoId: string,
  { jogadorId, mes }: { jogadorId: string; mes: string },
  contexto: { autorContaId: string; agora: Date },
): Promise<boolean> {
  return emTransacao(db, async (tx) => {
    const removido = await financeiro.desmarcar(tx, grupoId, jogadorId, mes);
    if (!removido) return false;
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: contexto.autorContaId },
      acao: 'pagamento_desmarcado',
      entidade: 'pagamento_mes',
      entidadeId: jogadorId,
      resumo: { mes, valorRemovidoCentavos: removido.lancamento?.valorCentavos ?? null },
      agora: contexto.agora,
    });
    return true;
  });
}
