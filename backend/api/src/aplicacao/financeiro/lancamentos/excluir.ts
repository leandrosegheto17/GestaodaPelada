import { emTransacao, type Db } from '../../../infraestrutura/db/index.js';
import * as auditoria from '../../../infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../../infraestrutura/db/repositorios/financeiro.js';

export const MSG_LANCAMENTO_VINCULADO =
  'Esta entrada é a mensalidade de um jogador. Desmarque o pagamento no mês para removê-la.';

export type ResultadoExcluir = { tipo: 'ok' } | { tipo: 'nao_encontrado' } | { tipo: 'vinculado' };

/**
 * Exclui o lançamento e audita na mesma transação. A entrada vinculada a um pagamento só sai desmarcando o
 * pagamento: a checagem responde 409 e a chave estrangeira cobre a corrida (pagamento marcado no meio).
 */
export async function excluirLancamento(
  db: Db,
  grupoId: string,
  id: string,
  contexto: { autorContaId: string; agora: Date },
): Promise<ResultadoExcluir> {
  try {
    return await emTransacao(db, async (tx): Promise<ResultadoExcluir> => {
      const atual = await financeiro.buscarLancamento(tx, grupoId, id);
      if (!atual) return { tipo: 'nao_encontrado' };
      if (atual.mensalidade) return { tipo: 'vinculado' };
      await financeiro.excluirLancamento(tx, grupoId, id);
      await auditoria.registrar(tx, grupoId, {
        autor: { tipo: 'conta', contaId: contexto.autorContaId },
        acao: 'lancamento_excluido',
        entidade: 'lancamento',
        entidadeId: id,
        resumo: { tipo: atual.tipo, data: atual.data, valorCentavos: atual.valorCentavos },
        agora: contexto.agora,
      });
      return { tipo: 'ok' };
    });
  } catch (erro) {
    if (erro instanceof financeiro.LancamentoVinculado) return { tipo: 'vinculado' };
    throw erro;
  }
}
