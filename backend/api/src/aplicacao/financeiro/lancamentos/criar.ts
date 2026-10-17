import type { Lancamento, LancamentoCorpo } from '@pelada/contrato';
import { emTransacao, type Db } from '../../../infraestrutura/db/index.js';
import * as auditoria from '../../../infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../../infraestrutura/db/repositorios/financeiro.js';
import { paraLancamento } from './forma.js';

/**
 * Cria um lançamento avulso (o vinculado a mensalidade só nasce ao marcar o pagamento) e audita na mesma
 * transação. O resumo da auditoria leva tipo, data e valor, nunca a descrição (texto livre).
 */
export async function criarLancamento(
  db: Db,
  grupoId: string,
  corpo: LancamentoCorpo,
  contexto: { autorContaId: string; agora: Date },
): Promise<Lancamento> {
  const id = await emTransacao(db, async (tx) => {
    const novo = await financeiro.criarLancamento(tx, grupoId, corpo, contexto.autorContaId, contexto.agora);
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: contexto.autorContaId },
      acao: 'lancamento_criado',
      entidade: 'lancamento',
      entidadeId: novo,
      resumo: { tipo: corpo.tipo, data: corpo.data, valorCentavos: corpo.valorCentavos },
      agora: contexto.agora,
    });
    return novo;
  });
  const criado = await financeiro.buscarLancamento(db, grupoId, id);
  if (!criado) throw new Error('Lançamento criado não encontrado.');
  return paraLancamento(criado);
}
