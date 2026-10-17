import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../../cliente.js';
import { codigoDe } from '../../codigo-erro.js';

export class LancamentoVinculado extends Error {
  constructor() {
    super('O lançamento está vinculado a um pagamento de mensalidade.');
  }
}

/** Soma vinda do banco (`bigint` chega como texto): inteiro seguro ou erro. */
function inteiroSeguro(valor: string | number | null): number {
  const n = Number(valor ?? 0);
  if (!Number.isSafeInteger(n)) throw new RangeError('Valor do caixa fora do limite seguro.');
  return n;
}

export interface LancamentoNovo {
  tipo: 'entrada' | 'saida';
  data: string;
  descricao: string;
  valorCentavos: number;
}

export interface LancamentoDoMes extends LancamentoNovo {
  id: string;
  /** Veio de um pagamento de mensalidade. */
  mensalidade: boolean;
}

export interface LancamentoCompleto extends LancamentoDoMes {
  alteradoPor: string;
  alteradoEm: Date;
}

/** Lançamentos entre as duas datas (inclusive), do mais recente ao mais antigo; `mensalidade` numa só consulta. */
export async function lancamentosDoMes(
  ex: ExecutorDb,
  grupoId: string,
  primeiroDia: string,
  ultimoDia: string,
): Promise<LancamentoDoMes[]> {
  const r = await sql<{
    id: string;
    tipo: 'entrada' | 'saida';
    data: string;
    descricao: string;
    valor: number;
    mensalidade: boolean;
  }>`
    SELECT l.id, l.tipo, l.data::text AS data, l.descricao, l.valor_centavos AS valor,
           (p.lancamento_id IS NOT NULL) AS mensalidade
    FROM lancamentos l
    LEFT JOIN pagamentos_mes p ON p.lancamento_id = l.id AND p.grupo_id = l.grupo_id
    WHERE l.grupo_id = ${grupoId} AND l.data BETWEEN ${primeiroDia}::date AND ${ultimoDia}::date
    ORDER BY l.data DESC, l.criado_em DESC, l.id
  `.execute(kyselyDe(ex));
  return r.rows.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    data: l.data,
    descricao: l.descricao,
    valorCentavos: l.valor,
    mensalidade: l.mensalidade,
  }));
}

/** Entradas e saídas entre as datas (inclusive), somadas no banco. */
export async function totaisEntre(
  ex: ExecutorDb,
  grupoId: string,
  desde: string,
  ate: string,
): Promise<{ entradasCentavos: number; saidasCentavos: number }> {
  const r = await sql<{ entradas: string | null; saidas: string | null }>`
    SELECT sum(valor_centavos) FILTER (WHERE tipo = 'entrada') AS entradas,
           sum(valor_centavos) FILTER (WHERE tipo = 'saida') AS saidas
    FROM lancamentos
    WHERE grupo_id = ${grupoId} AND data BETWEEN ${desde}::date AND ${ate}::date
  `.execute(kyselyDe(ex));
  const l = r.rows[0];
  return { entradasCentavos: inteiroSeguro(l?.entradas ?? null), saidasCentavos: inteiroSeguro(l?.saidas ?? null) };
}

export async function inserirLancamento(
  ex: ExecutorDb,
  grupoId: string,
  l: LancamentoNovo,
  autor: string,
  agora: Date,
): Promise<string> {
  const linha = await kyselyDe(ex)
    .insertInto('lancamentos')
    .values({
      grupo_id: grupoId,
      tipo: l.tipo,
      data: l.data,
      descricao: l.descricao,
      valor_centavos: l.valorCentavos,
      criado_por: autor,
      criado_em: agora,
      alterado_por: autor,
      alterado_em: agora,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return linha.id;
}

export async function buscarLancamento(
  ex: ExecutorDb,
  grupoId: string,
  id: string,
): Promise<LancamentoCompleto | null> {
  const r = await sql<{
    id: string;
    tipo: 'entrada' | 'saida';
    data: string;
    descricao: string;
    valor: number;
    mensalidade: boolean;
    alterado_por: string;
    alterado_em: Date;
  }>`
    SELECT l.id, l.tipo, l.data::text AS data, l.descricao, l.valor_centavos AS valor,
           EXISTS (SELECT 1 FROM pagamentos_mes p WHERE p.lancamento_id = l.id AND p.grupo_id = l.grupo_id) AS mensalidade,
           c.nome AS alterado_por, l.alterado_em
    FROM lancamentos l JOIN contas c ON c.id = l.alterado_por
    WHERE l.grupo_id = ${grupoId} AND l.id = ${id}
  `.execute(kyselyDe(ex));
  const l = r.rows[0];
  if (!l) return null;
  return {
    id: l.id,
    tipo: l.tipo,
    data: l.data,
    descricao: l.descricao,
    valorCentavos: l.valor,
    mensalidade: l.mensalidade,
    alteradoPor: l.alterado_por,
    alteradoEm: l.alterado_em,
  };
}

export async function criarLancamento(
  ex: ExecutorDb,
  grupoId: string,
  dados: LancamentoNovo,
  autor: string,
  agora: Date,
): Promise<string> {
  return inserirLancamento(ex, grupoId, dados, autor, agora);
}

/** Troca os campos do lançamento e devolve o anterior, ou `null` se não é deste grupo. */
export async function editarLancamento(
  ex: ExecutorDb,
  grupoId: string,
  id: string,
  dados: LancamentoNovo,
  autor: string,
  agora: Date,
): Promise<LancamentoCompleto | null> {
  const anterior = await buscarLancamento(ex, grupoId, id);
  if (!anterior) return null;
  await kyselyDe(ex)
    .updateTable('lancamentos')
    .set({
      tipo: dados.tipo,
      data: dados.data,
      descricao: dados.descricao,
      valor_centavos: dados.valorCentavos,
      alterado_por: autor,
      alterado_em: agora,
    })
    .where('grupo_id', '=', grupoId)
    .where('id', '=', id)
    .execute();
  return anterior;
}

/** Apaga o lançamento e o devolve; um vinculado a pagamento lança `LancamentoVinculado`. */
export async function excluirLancamento(
  ex: ExecutorDb,
  grupoId: string,
  id: string,
): Promise<LancamentoCompleto | null> {
  const anterior = await buscarLancamento(ex, grupoId, id);
  if (!anterior) return null;
  try {
    await kyselyDe(ex).deleteFrom('lancamentos').where('grupo_id', '=', grupoId).where('id', '=', id).execute();
  } catch (erro) {
    if (codigoDe(erro) === '23503') throw new LancamentoVinculado();
    throw erro;
  }
  return anterior;
}
