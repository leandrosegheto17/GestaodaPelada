import { Hono } from 'hono';
import { montarPainelUso } from '../../../aplicacao/uso/painel.js';
import type { AppEnv } from '../../app.js';
import { naoEncontrado } from '../../erros.js';

/** `GET /api/grupos/:grupoId/uso`: uso por semana; qualquer admin do grupo. */
export const rotaGrupoUso = new Hono<AppEnv>().get('/api/grupos/:grupoId/uso', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  return c.json(await montarPainelUso(c.var.db(), vinculo.grupoId));
});
