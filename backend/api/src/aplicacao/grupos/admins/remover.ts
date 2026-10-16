import { emTransacao, type Db } from '../../../infraestrutura/db/index.js';
import * as auditoria from '../../../infraestrutura/db/repositorios/auditoria.js';
import * as vinculos from '../../../infraestrutura/db/repositorios/vinculos.js';
import { AdminNaoEncontrado, RemoverASiMesmo, UltimoAdmin } from './erros.js';

/**
 * Remove o vínculo do admin com o grupo. Na transação, a contagem trava o grupo, então duas
 * remoções cruzadas não deixam o grupo sem admin (RN-13). As sessões do removido não caem: o
 * acesso a este grupo acaba na próxima requisição, porque o vínculo é lido a cada uma.
 */
export async function removerAdmin(
  db: Db,
  grupoId: string,
  entrada: { alvoContaId: string; autorContaId: string; agora: Date },
): Promise<void> {
  if (entrada.alvoContaId === entrada.autorContaId) throw new RemoverASiMesmo();
  await emTransacao(db, async (tx) => {
    const total = await vinculos.contarAdmins(tx, grupoId);
    if (!(await vinculos.buscar(tx, grupoId, entrada.alvoContaId))) throw new AdminNaoEncontrado();
    if (total <= 1) throw new UltimoAdmin();
    await vinculos.remover(tx, grupoId, entrada.alvoContaId);
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: entrada.autorContaId },
      acao: 'admin_removido',
      entidade: 'conta',
      entidadeId: entrada.alvoContaId,
      agora: entrada.agora,
    });
  });
}
