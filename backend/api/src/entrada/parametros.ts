import { uuid } from '@pelada/contrato';
import type { Context } from 'hono';

/** Parâmetro de rota que precisa ser um uuid; malformado volta `null` (a rota responde 404 sem consultar). */
export function uuidDaRota(c: Context, nome: string): string | null {
  const valor = c.req.param(nome);
  return valor !== undefined && uuid.safeParse(valor).success ? valor : null;
}
