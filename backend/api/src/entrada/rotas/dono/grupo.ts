import { uuid } from '@pelada/contrato';
import { Hono } from 'hono';
import { carregarGrupoDono } from '../../../aplicacao/dono/grupo-dono.js';
import type { AppEnv } from '../../app.js';
import { naoEncontrado } from '../../erros.js';

/** `GET /api/dono/grupos/:id`: metadados, link público e admins do grupo (também arquivado). */
export const rotaDonoGrupo = new Hono<AppEnv>().get('/api/dono/grupos/:id', async (c) => {
  const id = c.req.param('id');
  if (!uuid.safeParse(id).success) return naoEncontrado(c);
  const grupo = await carregarGrupoDono(c.var.db(), c.var.config.urlPublica, id);
  return grupo ? c.json(grupo) : naoEncontrado(c);
});
