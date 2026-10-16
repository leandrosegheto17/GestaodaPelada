import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';

export class GrupoNaoEncontrado extends Error {
  constructor() {
    super('Grupo não encontrado.');
  }
}
export class NomeNaoConfere extends Error {
  constructor() {
    super('O nome digitado não confere com o nome do grupo.');
  }
}

/**
 * Arquiva o grupo se o nome digitado for exatamente o do grupo (sem ignorar caixa nem espaços).
 * Já arquivado não muda: a data original e a auditoria ficam como estavam.
 */
export async function arquivarGrupo(
  db: Db,
  grupoId: string,
  entrada: { nomeConfirmacao: string; autorId: string; agora: Date },
): Promise<void> {
  await emTransacao(db, async (tx) => {
    const grupo = await grupos.buscarPorId(tx, grupoId);
    if (!grupo) throw new GrupoNaoEncontrado();
    if (entrada.nomeConfirmacao !== grupo.nome) throw new NomeNaoConfere();
    if (grupo.arquivadoEm) return;
    await grupos.arquivar(tx, grupoId, entrada.agora);
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: entrada.autorId },
      acao: 'grupo_arquivado',
      entidade: 'grupo',
      entidadeId: grupoId,
      resumo: { nome: grupo.nome },
      agora: entrada.agora,
    });
  });
}

/** Reativa o grupo arquivado; se já está ativo, não faz nada. */
export async function reativarGrupo(db: Db, grupoId: string, entrada: { autorId: string; agora: Date }): Promise<void> {
  await emTransacao(db, async (tx) => {
    const grupo = await grupos.buscarPorId(tx, grupoId);
    if (!grupo) throw new GrupoNaoEncontrado();
    if (!grupo.arquivadoEm) return;
    await grupos.reativar(tx, grupoId);
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: entrada.autorId },
      acao: 'grupo_reativado',
      entidade: 'grupo',
      entidadeId: grupoId,
      resumo: { nome: grupo.nome },
      agora: entrada.agora,
    });
  });
}
