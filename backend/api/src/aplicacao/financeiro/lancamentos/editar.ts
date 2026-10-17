import type { Lancamento, LancamentoCorpo } from '@pelada/contrato';
import { emTransacao, type Db } from '../../../infraestrutura/db/index.js';
import * as auditoria from '../../../infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../../infraestrutura/db/repositorios/financeiro.js';
import { paraLancamento } from './forma.js';

export const MSG_MENSALIDADE_E_ENTRADA = 'A mensalidade é sempre uma entrada.';

export type ResultadoEditar =
  | { tipo: 'ok'; lancamento: Lancamento }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'invalido'; campos: Record<string, string> };

/**
 * Edita o lançamento (inclusive o valor de uma entrada vinculada a pagamento, que continua vinculada) e audita
 * na mesma transação, com o valor antes e depois. A entrada de mensalidade não pode virar saída.
 */
export async function editarLancamento(
  db: Db,
  grupoId: string,
  id: string,
  corpo: LancamentoCorpo,
  contexto: { autorContaId: string; agora: Date },
): Promise<ResultadoEditar> {
  const resultado = await emTransacao(
    db,
    async (tx): Promise<Exclude<ResultadoEditar, { tipo: 'ok' }> | { tipo: 'gravado' }> => {
      const atual = await financeiro.buscarLancamento(tx, grupoId, id);
      if (!atual) return { tipo: 'nao_encontrado' };
      if (atual.mensalidade && corpo.tipo !== 'entrada') {
        return { tipo: 'invalido', campos: { tipo: MSG_MENSALIDADE_E_ENTRADA } };
      }
      await financeiro.editarLancamento(tx, grupoId, id, corpo, contexto.autorContaId, contexto.agora);
      await auditoria.registrar(tx, grupoId, {
        autor: { tipo: 'conta', contaId: contexto.autorContaId },
        acao: 'lancamento_editado',
        entidade: 'lancamento',
        entidadeId: id,
        resumo: {
          valorAntes: atual.valorCentavos,
          valorDepois: corpo.valorCentavos,
          tipo: corpo.tipo,
          data: corpo.data,
          mensalidade: atual.mensalidade,
        },
        agora: contexto.agora,
      });
      return { tipo: 'gravado' };
    },
  );
  if (resultado.tipo !== 'gravado') return resultado;
  const editado = await financeiro.buscarLancamento(db, grupoId, id);
  if (!editado) throw new Error('Lançamento editado não encontrado.');
  return { tipo: 'ok', lancamento: paraLancamento(editado) };
}
