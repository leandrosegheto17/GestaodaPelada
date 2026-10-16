import { Hono } from 'hono';
import { montarPainel } from '../../../aplicacao/dono/painel.js';
import type { AppEnv } from '../../app.js';

/** `GET /api/dono/painel`: pedidos de reset pendentes e metadados dos grupos. */
export const rotaDonoPainel = new Hono<AppEnv>().get('/api/dono/painel', async (c) => {
  const dono = c.var.sessao;
  if (dono === null) return c.body(null, 401);
  return c.json(await montarPainel(c.var.db(), dono.conta.id));
});
