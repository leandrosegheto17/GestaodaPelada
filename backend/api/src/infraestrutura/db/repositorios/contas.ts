import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

/**
 * Hash bcrypt fixo (custo 12, sem relação com nenhuma senha) usado quando o e-mail não existe:
 * o login gasta o mesmo tempo com ou sem conta (ADR-015).
 */
const HASH_FIXO = '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234';

export interface Conta {
  id: string;
  email: string;
  nome: string;
  senhaTemporaria: boolean;
  eDono: boolean;
  avisoPrivacidadeVistoEm: Date | null;
}

const COLUNAS = ['id', 'email', 'nome', 'senha_temporaria', 'e_dono', 'aviso_privacidade_visto_em'] as const;

interface LinhaConta {
  id: string;
  email: string;
  nome: string;
  senha_temporaria: boolean;
  e_dono: boolean;
  aviso_privacidade_visto_em: Date | null;
}

const paraConta = (l: LinhaConta): Conta => ({
  id: l.id,
  email: l.email,
  nome: l.nome,
  senhaTemporaria: l.senha_temporaria,
  eDono: l.e_dono,
  avisoPrivacidadeVistoEm: l.aviso_privacidade_visto_em,
});

/** Nunca devolve o hash da senha. O e-mail chega normalizado (contrato). */
export async function buscarPorEmail(ex: ExecutorDb, email: string): Promise<Conta | null> {
  const linha = await kyselyDe(ex).selectFrom('contas').select(COLUNAS).where('email', '=', email).executeTakeFirst();
  return linha ? paraConta(linha) : null;
}

export async function buscarPorId(ex: ExecutorDb, contaId: string): Promise<Conta | null> {
  const linha = await kyselyDe(ex).selectFrom('contas').select(COLUNAS).where('id', '=', contaId).executeTakeFirst();
  return linha ? paraConta(linha) : null;
}

export interface NovaConta {
  email: string;
  nome: string;
  senha: string;
  senhaTemporaria: boolean;
  agora: Date;
}

/** Cria a conta com o hash calculado no Postgres. Não aceita `eDono`: o papel só nasce por script. */
export async function criar(ex: ExecutorDb, nova: NovaConta): Promise<string> {
  const linha = await kyselyDe(ex)
    .insertInto('contas')
    .values({
      email: nova.email,
      nome: nova.nome,
      senha_hash: sql<string>`crypt(${nova.senha}, gen_salt('bf', 12))`,
      senha_temporaria: nova.senhaTemporaria,
      criada_em: nova.agora,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return linha.id;
}

export interface SenhaVerificada {
  contaId: string;
  senhaTemporaria: boolean;
}

/**
 * Confere e-mail e senha numa só consulta. Sem conta, o bcrypt roda contra um hash fixo,
 * com o mesmo custo do caso real.
 */
export async function verificarSenha(ex: ExecutorDb, email: string, senha: string): Promise<SenhaVerificada | null> {
  const resultado = await sql<{
    id: string | null;
    senha_temporaria: boolean | null;
    ok: boolean;
  }>`
    SELECT c.id, c.senha_temporaria,
           crypt(${senha}, coalesce(c.senha_hash, ${HASH_FIXO})) = coalesce(c.senha_hash, ${HASH_FIXO}) AS ok
    FROM (SELECT ${email}::text AS email) e
    LEFT JOIN contas c ON c.email = e.email
  `.execute(kyselyDe(ex));
  const linha = resultado.rows[0];
  if (!linha || !linha.ok || linha.id === null) return null;
  return { contaId: linha.id, senhaTemporaria: linha.senha_temporaria ?? false };
}

export async function trocarSenha(
  ex: ExecutorDb,
  contaId: string,
  novaSenha: string,
  opcoes: { temporaria: boolean },
): Promise<void> {
  await kyselyDe(ex)
    .updateTable('contas')
    .set({
      senha_hash: sql<string>`crypt(${novaSenha}, gen_salt('bf', 12))`,
      senha_temporaria: opcoes.temporaria,
    })
    .where('id', '=', contaId)
    .execute();
}

/** Idempotente: o primeiro momento é mantido. */
export async function marcarAvisoVisto(ex: ExecutorDb, contaId: string, agora: Date): Promise<void> {
  await kyselyDe(ex)
    .updateTable('contas')
    .set({ aviso_privacidade_visto_em: sql<Date>`coalesce(aviso_privacidade_visto_em, ${agora})` })
    .where('id', '=', contaId)
    .execute();
}

/**
 * Cria a conta do dono (papel `e_dono`). Única escrita desse papel no código da API: só
 * `backend/scripts/dono.ts` a usa (regra de lint e checagem de CI). O banco ainda exige que
 * exista no máximo um dono e que o e-mail seja o do RF-01.
 */
export async function criarContaDono(
  ex: ExecutorDb,
  nova: { email: string; nome: string; senha: string; agora: Date },
): Promise<string> {
  const linha = await kyselyDe(ex)
    .insertInto('contas')
    .values({
      email: nova.email,
      nome: nova.nome,
      senha_hash: sql<string>`crypt(${nova.senha}, gen_salt('bf', 12))`,
      senha_temporaria: true,
      e_dono: true,
      criada_em: nova.agora,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return linha.id;
}
