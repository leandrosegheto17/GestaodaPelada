import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { JogadorComHistorico } from '../../infraestrutura/db/repositorios/jogadores.js';

export type ResultadoExcluir = { tipo: 'ok' } | { tipo: 'nao_encontrado' } | { tipo: 'com_historico'; apelido: string };

/**
 * Exclui o jogador (e os períodos) só se não tem presença nem nota; com histórico, a saída é
 * inativar. A exclusão é auditada na mesma transação.
 */
export async function excluirJogador(
  db: Db,
  grupoId: string,
  jogadorId: string,
  contexto: { autorContaId: string; agora: Date },
): Promise<ResultadoExcluir> {
  let apelido = '';
  try {
    return await emTransacao(db, async (tx): Promise<ResultadoExcluir> => {
      const jogador = await jogadores.buscar(tx, grupoId, jogadorId);
      if (!jogador) return { tipo: 'nao_encontrado' };
      apelido = jogador.apelido;
      if (await jogadores.temHistorico(tx, grupoId, jogadorId)) return { tipo: 'com_historico', apelido };
      await jogadores.excluir(tx, grupoId, jogadorId);
      await auditoria.registrar(tx, grupoId, {
        autor: { tipo: 'conta', contaId: contexto.autorContaId },
        acao: 'jogador_excluido',
        entidade: 'jogador',
        entidadeId: jogadorId,
        resumo: { apelido },
        agora: contexto.agora,
      });
      return { tipo: 'ok' };
    });
  } catch (erro) {
    if (erro instanceof JogadorComHistorico) return { tipo: 'com_historico', apelido };
    throw erro;
  }
}
