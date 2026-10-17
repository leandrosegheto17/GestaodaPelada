import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb, type Tx } from '../cliente.js';

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
export class LancamentoVinculado extends Error {
  constructor() {
    super('O lançamento está vinculado a um pagamento de mensalidade.');
  }
}

const codigoDe = (erro: unknown): string | undefined => (erro as { code?: string }).code;

/** Soma vinda do banco (`bigint` chega como texto): inteiro seguro ou erro. */
function inteiroSeguro(valor: string | number | null): number {
  const n = Number(valor ?? 0);
  if (!Number.isSafeInteger(n)) throw new RangeError('Valor do caixa fora do limite seguro.');
  return n;
}

export interface ConfigFinanceira {
  mensalidadeCentavos: number | null;
  saldoInicialCentavos: number;
  dataSaldoInicial: string;
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

export async function lerConfig(ex: ExecutorDb, grupoId: string): Promise<ConfigFinanceira | null> {
  const r = await sql<{ mensalidade: number | null; saldo: number; data: string }>`
    SELECT mensalidade_centavos AS mensalidade, saldo_inicial_centavos AS saldo, data_saldo_inicial::text AS data
    FROM config_financeira WHERE grupo_id = ${grupoId}
  `.execute(kyselyDe(ex));
  const l = r.rows[0];
  return l ? { mensalidadeCentavos: l.mensalidade, saldoInicialCentavos: l.saldo, dataSaldoInicial: l.data } : null;
}

/** Grava a configuração (uma por grupo) e devolve a anterior, se havia. */
export async function salvarConfig(
  ex: ExecutorDb,
  grupoId: string,
  dados: ConfigFinanceira,
): Promise<ConfigFinanceira | null> {
  const anterior = await lerConfig(ex, grupoId);
  await sql`
    INSERT INTO config_financeira (grupo_id, mensalidade_centavos, saldo_inicial_centavos, data_saldo_inicial)
    VALUES (${grupoId}, ${dados.mensalidadeCentavos}, ${dados.saldoInicialCentavos}, ${dados.dataSaldoInicial}::date)
    ON CONFLICT (grupo_id) DO UPDATE SET
      mensalidade_centavos = EXCLUDED.mensalidade_centavos,
      saldo_inicial_centavos = EXCLUDED.saldo_inicial_centavos,
      data_saldo_inicial = EXCLUDED.data_saldo_inicial
  `.execute(kyselyDe(ex));
  return anterior;
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

async function inserirLancamento(
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
