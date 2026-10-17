import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

const MINUTO_MS = 60 * 1000;
/** Janela em que as falhas de um e-mail contam para o bloqueio. */
export const JANELA_TENTATIVAS = 15 * MINUTO_MS;
/** Tentativas mais velhas que isto são podadas. */
export const RETENCAO_TENTATIVAS = 24 * 60 * MINUTO_MS;

/** Falhas seguidas que bloqueiam o e-mail por uma janela. */
export const LIMITE_FALHAS = 5;

/** Momentos das falhas dentro da janela e depois do último sucesso (o sucesso zera a contagem). */
async function falhasDaJanela(ex: ExecutorDb, email: string, agora: Date): Promise<Date[]> {
  const desde = new Date(agora.getTime() - JANELA_TENTATIVAS);
  const resultado = await sql<{ momento: Date }>`
    SELECT momento FROM tentativas_login
    WHERE email = ${email} AND NOT sucesso AND momento > ${desde}
      AND momento > coalesce(
        (SELECT max(momento) FROM tentativas_login WHERE email = ${email} AND sucesso),
        '-infinity'::timestamptz)
    ORDER BY momento
  `.execute(kyselyDe(ex));
  return resultado.rows.map((linha) => linha.momento);
}

export async function contarFalhasRecentes(ex: ExecutorDb, email: string, agora: Date): Promise<number> {
  return (await falhasDaJanela(ex, email, agora)).length;
}

export interface Bloqueio {
  falhas: number;
  /** Momento em que o e-mail volta a poder tentar; nulo se não está bloqueado. */
  liberaEm: Date | null;
}

/** 5 falhas na janela bloqueiam o e-mail até 15 minutos depois da 5ª falha. */
export async function consultarBloqueio(ex: ExecutorDb, email: string, agora: Date): Promise<Bloqueio> {
  const falhas = await falhasDaJanela(ex, email, agora);
  const quinta = falhas[LIMITE_FALHAS - 1];
  return {
    falhas: falhas.length,
    liberaEm: quinta ? new Date(quinta.getTime() + JANELA_TENTATIVAS) : null,
  };
}

export async function registrar(
  ex: ExecutorDb,
  tentativa: { email: string; sucesso: boolean; agora: Date },
): Promise<void> {
  await kyselyDe(ex)
    .insertInto('tentativas_login')
    .values({ email: tentativa.email, sucesso: tentativa.sucesso, momento: tentativa.agora })
    .execute();
}

/**
 * Serializa por e-mail (trava de transação) e, se o e-mail não está bloqueado, grava já uma falha
 * provisória. Assim pedidos paralelos não leem todos "0 falhas" antes da verificação da senha.
 * Deve rodar numa transação curta, fora do hash da senha. Devolve a liberação (bloqueado) ou o id da falha provisória.
 */
export async function reservarFalha(
  ex: ExecutorDb,
  email: string,
  agora: Date,
): Promise<{ liberaEm: Date } | { id: string }> {
  await sql`SELECT pg_advisory_xact_lock(hashtext(${email}))`.execute(kyselyDe(ex));
  const bloqueio = await consultarBloqueio(ex, email, agora);
  if (bloqueio.liberaEm) return { liberaEm: bloqueio.liberaEm };
  const linha = await kyselyDe(ex)
    .insertInto('tentativas_login')
    .values({ email, sucesso: false, momento: agora })
    .returning('id')
    .executeTakeFirstOrThrow();
  return { id: linha.id };
}

/** Remove a falha provisória quando a senha confere. */
export async function descartarFalha(ex: ExecutorDb, id: string): Promise<void> {
  await kyselyDe(ex).deleteFrom('tentativas_login').where('id', '=', id).execute();
}

/** Apaga as tentativas com mais de um dia e devolve quantas eram. */
export async function podar(ex: ExecutorDb, agora: Date): Promise<number> {
  const limite = new Date(agora.getTime() - RETENCAO_TENTATIVAS);
  const resultado = await kyselyDe(ex).deleteFrom('tentativas_login').where('momento', '<', limite).executeTakeFirst();
  return Number(resultado.numDeletedRows);
}
