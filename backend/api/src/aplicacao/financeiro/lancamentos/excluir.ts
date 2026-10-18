import { emTransacao, type Db } from '../../../infraestrutura/db/index.js';
import * as auditoria from '../../../infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../../infraestrutura/db/repositorios/financeiro.js';

export type ResultadoExcluir = { tipo: 'ok' } | { tipo: 'nao_encontrado' } | { tipo: 'vinculado'; mensagem: string };

/** Só apelido e mês do pagamento vinculado; sem o vínculo (já desmarcado na corrida), o texto fica genérico. */
function mensagemVinculado(vinculo: { apelido: string; mes: string } | null): string {
  const quem = vinculo ? `${vinculo.apelido} ${vinculo.mes.slice(5, 7)}/${vinculo.mes.slice(0, 4)}` : 'um jogador';
  return `Esta entrada é a mensalidade de ${quem}. Desmarque o pagamento no mês para removê-la.`;
}

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
      if (atual.mensalidade) {
        const vinculo = await financeiro.pagamentoDoLancamento(tx, grupoId, id);
        return { tipo: 'vinculado', mensagem: mensagemVinculado(vinculo) };
      }
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
    if (erro instanceof financeiro.LancamentoVinculado) {
      const vinculo = await financeiro.pagamentoDoLancamento(db, grupoId, id);
      return { tipo: 'vinculado', mensagem: mensagemVinculado(vinculo) };
    }
    throw erro;
  }
}
