import { listaHabilidades } from '@pelada/contrato';
import { Hono } from 'hono';
import type { AppEnv } from '../../../app.js';
import { naoEncontrado } from '../../../erros.js';
import { listar } from '../../../../infraestrutura/db/repositorios/habilidades.js';

/** `GET /api/grupos/:grupoId/habilidades`: catálogo do grupo, na ordem de cadastro. */
export const rotaHabilidadesListar = new Hono<AppEnv>().get('/api/grupos/:grupoId/habilidades', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const habilidades = await listar(c.var.db(), vinculo.grupoId);
  return c.json(listaHabilidades.parse({ habilidades }));
});
