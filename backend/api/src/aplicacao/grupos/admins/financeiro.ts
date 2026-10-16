import { emTransacao, type Db } from '../../../infraestrutura/db/index.js';
import * as auditoria from '../../../infraestrutura/db/repositorios/auditoria.js';
import * as vinculos from '../../../infraestrutura/db/repositorios/vinculos.js';
import { AcaoNaPropriaConta, AdminNaoEncontrado } from './erros.js';

/**
 * Concede ou retira o acesso ao financeiro de outro admin do grupo. Quem pede já passou por
 * `exigirFinanceiro`. Valor igual ao atual não grava nem audita. Ninguém altera a própria permissão,
 * então sempre sobra quem possa conceder de novo.
 */
export async function alterarFinanceiroAdmin(
  db: Db,
  grupoId: string,
  entrada: { alvoContaId: string; valor: boolean; autorContaId: string; agora: Date },
): Promise<void> {
  if (entrada.alvoContaId === entrada.autorContaId) throw new AcaoNaPropriaConta();
  await emTransacao(db, async (tx) => {
    const atual = await vinculos.buscar(tx, grupoId, entrada.alvoContaId);
    if (!atual) throw new AdminNaoEncontrado();
    if (atual.acessaFinanceiro === entrada.valor) return;
    await vinculos.alterarAcessaFinanceiro(tx, grupoId, entrada.alvoContaId, entrada.valor);
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: entrada.autorContaId },
      acao: entrada.valor ? 'financeiro_concedido' : 'financeiro_retirado',
      entidade: 'conta',
      entidadeId: entrada.alvoContaId,
      agora: entrada.agora,
    });
  });
}
