import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../app.js';
import { naoEncontrado } from '../erros.js';
import { recusarSemSessaoCompleta } from './sessao.js';

/** Só o dono acessa `/api/dono/*`; qualquer outra conta recebe 404. */
export const exigirDono: MiddlewareHandler<AppEnv> = async (c, proximo) => {
  const recusa = recusarSemSessaoCompleta(c);
  if (recusa) return recusa;
  if (c.var.sessao?.conta.eDono !== true) return naoEncontrado(c);
  return proximo();
};
