import type { Context } from 'hono';
import type { ZodError } from '@pelada/contrato';
import { corpoErro, responderValidacao } from './erros.js';

interface Esquema<T> {
  safeParse(valor: unknown): { success: true; data: T } | { success: false; error: ZodError };
}

export type CorpoLido<T> = { ok: true; dado: T } | { ok: false; resposta: Response };

/** Lê o JSON do pedido e valida com o schema do contrato; falha vira 422 padrão (sem ecoar valores). */
export async function lerCorpo<T>(c: Context, schema: Esquema<T>): Promise<CorpoLido<T>> {
  let bruto: unknown;
  try {
    bruto = await c.req.json();
  } catch {
    return {
      ok: false,
      resposta: c.json(corpoErro('validacao', 'Corrija os campos indicados.', { corpo: 'Envie um JSON válido.' }), 422),
    };
  }
  const resultado = schema.safeParse(bruto);
  if (!resultado.success) return { ok: false, resposta: responderValidacao(c, resultado.error) };
  return { ok: true, dado: resultado.data };
}
