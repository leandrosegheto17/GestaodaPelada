import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as partidas from '../../infraestrutura/db/repositorios/partidas.js';
import { PartidaNaoEncontrada } from './editar.js';

/** Exclui a partida e as presenças e audita, numa transação. O evento de uso já registrado permanece. */
export async function excluirPartida(
  db: Db,
  grupoId: string,
  data: string,
  contexto: { autorContaId: string; agora: Date },
): Promise<void> {
  await emTransacao(db, async (tx) => {
    if (!(await partidas.excluir(tx, grupoId, data))) throw new PartidaNaoEncontrada();
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: contexto.autorContaId },
      acao: 'partida_excluida',
      entidade: 'partida',
      entidadeId: data,
      resumo: { data },
      agora: contexto.agora,
    });
  });
}
