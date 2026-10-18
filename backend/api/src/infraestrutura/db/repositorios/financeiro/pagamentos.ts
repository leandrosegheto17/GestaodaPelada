import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb, type Tx } from '../../cliente.js';
import { codigoDe } from '../../codigo-erro.js';
import { inserirLancamento, type LancamentoDoMes, type LancamentoNovo } from './lancamentos.js';

export class PagamentoJaMarcado extends Error {
  constructor() {
    super('O pagamento deste mês já está marcado.');
  }
}
export class JogadorNaoEncontrado extends Error {
  constructor() {
    super('Jogador não encontrado neste grupo.');
  }
}

export async function pagamentosDoMes(
  ex: ExecutorDb,
  grupoId: string,
  mes: string,
): Promise<{ jogadorId: string; lancamentoId: string | null }[]> {
  const r = await sql<{ jogador_id: string; lancamento_id: string | null }>`
    SELECT jogador_id, lancamento_id FROM pagamentos_mes WHERE grupo_id = ${grupoId} AND mes = ${mes}
  `.execute(kyselyDe(ex));
  return r.rows.map((l) => ({ jogadorId: l.jogador_id, lancamentoId: l.lancamento_id }));
}

/** Jogador e mês (`aaaa-mm`) do pagamento a que o lançamento está vinculado, ou `null` se não há. */
export async function pagamentoDoLancamento(
  ex: ExecutorDb,
  grupoId: string,
  lancamentoId: string,
): Promise<{ apelido: string; mes: string } | null> {
  const r = await sql<{ apelido: string; mes: string }>`
    SELECT j.apelido, p.mes::text AS mes
    FROM pagamentos_mes p JOIN jogadores j ON j.id = p.jogador_id AND j.grupo_id = p.grupo_id
    WHERE p.grupo_id = ${grupoId} AND p.lancamento_id = ${lancamentoId}
  `.execute(kyselyDe(ex));
  return r.rows[0] ?? null;
}

/**
 * Marca o pagamento do mês, com o lançamento de entrada vinculado quando há mensalidade. As duas gravações
 * andam juntas: exige transação.
 */
export async function marcar(
  tx: Tx,
  grupoId: string,
  dados: {
    jogadorId: string;
    mes: string;
    lancamento: Omit<LancamentoNovo, 'tipo'> | null;
    autor: string;
    agora: Date;
  },
): Promise<{ lancamentoId: string | null }> {
  const lancamentoId = dados.lancamento
    ? await inserirLancamento(tx, grupoId, { ...dados.lancamento, tipo: 'entrada' }, dados.autor, dados.agora)
    : null;
  try {
    await kyselyDe(tx)
      .insertInto('pagamentos_mes')
      .values({
        grupo_id: grupoId,
        jogador_id: dados.jogadorId,
        mes: dados.mes,
        lancamento_id: lancamentoId,
        marcado_por: dados.autor,
        marcado_em: dados.agora,
      })
      .execute();
  } catch (erro) {
    if (codigoDe(erro) === '23505') throw new PagamentoJaMarcado();
    if (codigoDe(erro) === '23503') throw new JogadorNaoEncontrado();
    throw erro;
  }
  return { lancamentoId };
}

/** Desmarca o pagamento e apaga o lançamento vinculado; devolve o que removeu ou `null` se não estava marcado. */
export async function desmarcar(
  tx: Tx,
  grupoId: string,
  jogadorId: string,
  mes: string,
): Promise<{ lancamento: LancamentoDoMes | null } | null> {
  const banco = kyselyDe(tx);
  const removido = await banco
    .deleteFrom('pagamentos_mes')
    .where('grupo_id', '=', grupoId)
    .where('jogador_id', '=', jogadorId)
    .where('mes', '=', mes)
    .returning('lancamento_id')
    .executeTakeFirst();
  if (!removido) return null;
  if (removido.lancamento_id === null) return { lancamento: null };
  const r = await sql<{ id: string; tipo: 'entrada' | 'saida'; data: string; descricao: string; valor: number }>`
    DELETE FROM lancamentos WHERE grupo_id = ${grupoId} AND id = ${removido.lancamento_id}
    RETURNING id, tipo, data::text AS data, descricao, valor_centavos AS valor
  `.execute(banco);
  const l = r.rows[0];
  return {
    lancamento: l
      ? { id: l.id, tipo: l.tipo, data: l.data, descricao: l.descricao, valorCentavos: l.valor, mensalidade: true }
      : null,
  };
}
