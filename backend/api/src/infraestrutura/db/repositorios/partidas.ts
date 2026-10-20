import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb, type Tx } from '../cliente.js';
import { seViolarUnico } from './comum.js';

export class PartidaDuplicada extends Error {
  constructor() {
    super('Já existe uma partida nesta data.');
  }
}
export class JogadorForaDoGrupo extends Error {
  constructor() {
    super('Há jogador que não pertence ao grupo.');
  }
}

export type SituacaoGravada = 'presente' | 'lesionado' | 'expulso';

export interface PresencaGravada {
  jogadorId: string;
  situacao: SituacaoGravada;
}

export interface PartidaDoMes {
  data: string;
  choveu: boolean;
  contagem: { presentes: number; lesionados: number; expulsos: number };
}

/** Partidas do mês (`AAAA-MM`), da mais recente para a mais antiga, com a contagem por situação. */
export async function porMes(ex: ExecutorDb, grupoId: string, mes: string): Promise<PartidaDoMes[]> {
  const r = await sql<{
    data: string;
    choveu: boolean;
    presentes: string;
    lesionados: string;
    expulsos: string;
  }>`
    SELECT p.data::text AS data, p.choveu,
           count(*) FILTER (WHERE pr.situacao = 'presente') AS presentes,
           count(*) FILTER (WHERE pr.situacao = 'lesionado') AS lesionados,
           count(*) FILTER (WHERE pr.situacao = 'expulso') AS expulsos
    FROM partidas p
    LEFT JOIN presencas pr ON pr.partida_id = p.id AND pr.grupo_id = p.grupo_id
    WHERE p.grupo_id = ${grupoId}
      AND p.data >= (${mes}::text || '-01')::date AND p.data < ((${mes}::text || '-01')::date + interval '1 month')
    GROUP BY p.id
    ORDER BY p.data DESC
  `.execute(kyselyDe(ex));
  return r.rows.map((l) => ({
    data: l.data,
    choveu: l.choveu,
    contagem: { presentes: Number(l.presentes), lesionados: Number(l.lesionados), expulsos: Number(l.expulsos) },
  }));
}

export interface PartidaDetalhada {
  id: string;
  data: string;
  choveu: boolean;
  /** Nome de quem alterou por último. */
  alteradaPor: string;
  alteradaEm: Date;
  presencas: PresencaGravada[];
}

export async function porData(ex: ExecutorDb, grupoId: string, data: string): Promise<PartidaDetalhada | null> {
  const r = await sql<{
    id: string;
    data: string;
    choveu: boolean;
    alterada_por: string;
    alterada_em: Date;
    presencas: { jogadorId: string; situacao: SituacaoGravada }[];
  }>`
    SELECT p.id, p.data::text AS data, p.choveu, a.nome AS alterada_por, p.alterada_em,
           coalesce(json_agg(json_build_object('jogadorId', pr.jogador_id, 'situacao', pr.situacao))
                    FILTER (WHERE pr.jogador_id IS NOT NULL), '[]'::json) AS presencas
    FROM partidas p
    JOIN contas a ON a.id = p.alterada_por
    LEFT JOIN presencas pr ON pr.partida_id = p.id AND pr.grupo_id = p.grupo_id
    WHERE p.grupo_id = ${grupoId} AND p.data = ${data}::date
    GROUP BY p.id, a.nome
  `.execute(kyselyDe(ex));
  const l = r.rows[0];
  if (!l) return null;
  return {
    id: l.id,
    data: l.data,
    choveu: l.choveu,
    alteradaPor: l.alterada_por,
    alteradaEm: l.alterada_em,
    presencas: l.presencas,
  };
}

export interface HistoricoDoGrupo {
  partidas: { id: string; data: string; choveu: boolean }[];
  presencas: { partidaId: string; jogadorId: string; situacao: SituacaoGravada }[];
}

/** Partidas até a data (inclusive), da mais antiga para a mais nova, com as presenças: 2 consultas. */
export async function historicoAte(ex: ExecutorDb, grupoId: string, data: string): Promise<HistoricoDoGrupo> {
  const banco = kyselyDe(ex);
  const partidas = await sql<{ id: string; data: string; choveu: boolean }>`
    SELECT id, data::text AS data, choveu FROM partidas
    WHERE grupo_id = ${grupoId} AND data <= ${data}::date ORDER BY data
  `.execute(banco);
  const presencas = await sql<{ partida_id: string; jogador_id: string; situacao: SituacaoGravada }>`
    SELECT pr.partida_id, pr.jogador_id, pr.situacao
    FROM presencas pr JOIN partidas p ON p.id = pr.partida_id AND p.grupo_id = pr.grupo_id
    WHERE pr.grupo_id = ${grupoId} AND p.data <= ${data}::date
  `.execute(banco);
  return {
    partidas: partidas.rows,
    presencas: presencas.rows.map((l) => ({ partidaId: l.partida_id, jogadorId: l.jogador_id, situacao: l.situacao })),
  };
}

/** Insere as presenças de uma vez; jogador que não é do grupo faz a transação inteira falhar. */
async function inserirPresencas(
  ex: Tx,
  grupoId: string,
  partidaId: string,
  presencas: readonly PresencaGravada[],
): Promise<void> {
  if (presencas.length === 0) return;
  const ids = presencas.map((p) => p.jogadorId);
  const situacoes = presencas.map((p) => p.situacao);
  const r = await sql`
    INSERT INTO presencas (partida_id, jogador_id, grupo_id, situacao)
    SELECT ${partidaId}::uuid, j.id, j.grupo_id, u.situacao
    FROM unnest(${ids}::uuid[], ${situacoes}::text[]) AS u(jogador_id, situacao)
    JOIN jogadores j ON j.id = u.jogador_id AND j.grupo_id = ${grupoId}
  `.execute(kyselyDe(ex));
  if (Number(r.numAffectedRows ?? 0) !== presencas.length) throw new JogadorForaDoGrupo();
}

export interface DadosDaPartida {
  choveu: boolean;
  presencas: readonly PresencaGravada[];
  autor: string;
  agora: Date;
}

export async function criar(ex: Tx, grupoId: string, partida: DadosDaPartida & { data: string }): Promise<string> {
  let id: string;
  try {
    const linha = await kyselyDe(ex)
      .insertInto('partidas')
      .values({
        grupo_id: grupoId,
        data: partida.data,
        choveu: partida.choveu,
        criada_por: partida.autor,
        criada_em: partida.agora,
        alterada_por: partida.autor,
        alterada_em: partida.agora,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    id = linha.id;
  } catch (erro) {
    return seViolarUnico(erro, 'partidas_grupo_id_data_key', () => new PartidaDuplicada());
  }
  await inserirPresencas(ex, grupoId, id, partida.presencas);
  return id;
}

/** Atualiza `choveu` e a última alteração e troca as presenças. `false` se não há partida na data. */
export async function substituir(ex: Tx, grupoId: string, data: string, partida: DadosDaPartida): Promise<boolean> {
  const banco = kyselyDe(ex);
  const linha = await banco
    .updateTable('partidas')
    .set({ choveu: partida.choveu, alterada_por: partida.autor, alterada_em: partida.agora })
    .where('grupo_id', '=', grupoId)
    .where('data', '=', data)
    .returning('id')
    .executeTakeFirst();
  if (!linha) return false;
  await banco.deleteFrom('presencas').where('partida_id', '=', linha.id).where('grupo_id', '=', grupoId).execute();
  await inserirPresencas(ex, grupoId, linha.id, partida.presencas);
  return true;
}

/** Apaga as presenças (cascata) e a partida. */
export async function excluir(ex: Tx, grupoId: string, data: string): Promise<boolean> {
  const r = await kyselyDe(ex)
    .deleteFrom('partidas')
    .where('grupo_id', '=', grupoId)
    .where('data', '=', data)
    .executeTakeFirst();
  return Number(r.numDeletedRows) > 0;
}

/** `AAAA-MM` da primeira partida do grupo; `null` se não há partidas. */
export async function mesDaPrimeiraPartida(ex: ExecutorDb, grupoId: string): Promise<string | null> {
  const r = await sql<{ mes: string | null }>`
    SELECT to_char(min(data), 'YYYY-MM') AS mes FROM partidas WHERE grupo_id = ${grupoId}
  `.execute(kyselyDe(ex));
  return r.rows[0]?.mes ?? null;
}
