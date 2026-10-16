import { kyselyDe, type ExecutorDb } from '../cliente.js';

const MINUTO_MS = 60 * 1000;
/** Janela em que as falhas de um e-mail contam para o bloqueio. */
export const JANELA_TENTATIVAS = 15 * MINUTO_MS;
/** Tentativas mais velhas que isto são podadas. */
export const RETENCAO_TENTATIVAS = 24 * 60 * MINUTO_MS;

export async function contarFalhasRecentes(ex: ExecutorDb, email: string, agora: Date): Promise<number> {
  const desde = new Date(agora.getTime() - JANELA_TENTATIVAS);
  const linha = await kyselyDe(ex)
    .selectFrom('tentativas_login')
    .select((eb) => eb.fn.countAll<string>().as('total'))
    .where('email', '=', email)
    .where('sucesso', '=', false)
    .where('momento', '>', desde)
    .executeTakeFirstOrThrow();
  return Number(linha.total);
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

/** Apaga as tentativas com mais de um dia e devolve quantas eram. */
export async function podar(ex: ExecutorDb, agora: Date): Promise<number> {
  const limite = new Date(agora.getTime() - RETENCAO_TENTATIVAS);
  const resultado = await kyselyDe(ex).deleteFrom('tentativas_login').where('momento', '<', limite).executeTakeFirst();
  return Number(resultado.numDeletedRows);
}
