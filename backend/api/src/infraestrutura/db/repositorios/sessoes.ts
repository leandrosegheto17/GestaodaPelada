import { sql } from 'kysely';
import type { EscopoSessao } from '@pelada/contrato';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

const DIA_MS = 24 * 60 * 60 * 1000;
/** Duração deslizante da sessão. */
export const DURACAO_SESSAO = 30 * DIA_MS;
/** A sessão só é renovada se o último uso tem mais que isto. */
export const INTERVALO_RENOVACAO = DIA_MS;

export interface NovaSessao {
  contaId: string;
  /** SHA-256 do token (32 bytes). */
  tokenHash: Uint8Array;
  escopo: EscopoSessao;
  agora: Date;
}

export async function criar(ex: ExecutorDb, nova: NovaSessao): Promise<{ id: string; expiraEm: Date }> {
  const expiraEm = new Date(nova.agora.getTime() + DURACAO_SESSAO);
  const linha = await kyselyDe(ex)
    .insertInto('sessoes')
    .values({
      token_hash: Buffer.from(nova.tokenHash),
      conta_id: nova.contaId,
      escopo: nova.escopo,
      criada_em: nova.agora,
      ultimo_uso_em: nova.agora,
      expira_em: expiraEm,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return { id: linha.id, expiraEm };
}

export interface SessaoValida {
  id: string;
  contaId: string;
  escopo: EscopoSessao;
  expiraEm: Date;
  /** Verdadeiro quando a expiração foi estendida (o middleware reenvia o cookie). */
  renovada: boolean;
}

/**
 * Busca a sessão ainda válida e, se o último uso passou de 24 h, desliza a expiração,
 * tudo num só UPDATE (sem segunda ida ao banco).
 */
export async function buscarValidaEDeslizar(
  ex: ExecutorDb,
  tokenHash: Uint8Array,
  agora: Date,
): Promise<SessaoValida | null> {
  const limiteRenovacao = new Date(agora.getTime() - INTERVALO_RENOVACAO);
  const novaExpiracao = new Date(agora.getTime() + DURACAO_SESSAO);
  const resultado = await sql<{
    id: string;
    conta_id: string;
    escopo: EscopoSessao;
    expira_em: Date;
    renovada: boolean;
  }>`
    WITH alvo AS (
      SELECT id, (ultimo_uso_em <= ${limiteRenovacao}) AS renovar
      FROM sessoes
      WHERE token_hash = ${Buffer.from(tokenHash)} AND expira_em > ${agora}
      FOR UPDATE
    )
    UPDATE sessoes s SET
      ultimo_uso_em = CASE WHEN alvo.renovar THEN ${agora}::timestamptz ELSE s.ultimo_uso_em END,
      expira_em = CASE WHEN alvo.renovar THEN ${novaExpiracao}::timestamptz ELSE s.expira_em END
    FROM alvo
    WHERE s.id = alvo.id
    RETURNING s.id, s.conta_id, s.escopo, s.expira_em, alvo.renovar AS renovada
  `.execute(kyselyDe(ex));
  const linha = resultado.rows[0];
  if (!linha) return null;
  return {
    id: linha.id,
    contaId: linha.conta_id,
    escopo: linha.escopo,
    expiraEm: linha.expira_em,
    renovada: linha.renovada,
  };
}

export async function trocarEscopo(ex: ExecutorDb, sessaoId: string, escopo: EscopoSessao): Promise<void> {
  await kyselyDe(ex).updateTable('sessoes').set({ escopo }).where('id', '=', sessaoId).execute();
}

/** Idempotente: devolve se havia sessão para apagar. */
export async function encerrar(ex: ExecutorDb, tokenHash: Uint8Array): Promise<boolean> {
  const resultado = await kyselyDe(ex)
    .deleteFrom('sessoes')
    .where('token_hash', '=', Buffer.from(tokenHash))
    .executeTakeFirst();
  return Number(resultado.numDeletedRows) > 0;
}

/** Encerra as sessões da conta; `exceto` preserva a sessão atual (ex.: ao trocar a senha). */
export async function encerrarTodasDaConta(
  ex: ExecutorDb,
  contaId: string,
  opcoes: { exceto?: string } = {},
): Promise<number> {
  let consulta = kyselyDe(ex).deleteFrom('sessoes').where('conta_id', '=', contaId);
  if (opcoes.exceto) consulta = consulta.where('id', '<>', opcoes.exceto);
  const resultado = await consulta.executeTakeFirst();
  return Number(resultado.numDeletedRows);
}
