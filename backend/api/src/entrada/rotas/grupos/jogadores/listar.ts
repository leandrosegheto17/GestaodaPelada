import { jogadoresConsulta } from '@pelada/contrato';
import { Hono } from 'hono';
import { listarJogadores } from '../../../../aplicacao/elenco/listar.js';
import type { AppEnv } from '../../../app.js';
import { responderValidacao, naoEncontrado } from '../../../erros.js';

/** `GET /api/grupos/:grupoId/jogadores?filtro=ativos|inativos`: ativos e inativos por apelido, com nível. */
export const rotaJogadoresListar = new Hono<AppEnv>().get('/api/grupos/:grupoId/jogadores', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const consulta = jogadoresConsulta.safeParse(c.req.query());
  if (!consulta.success) return responderValidacao(c, consulta.error);
  return c.json(await listarJogadores(c.var.db(), vinculo.grupoId, c.var.relogio.hoje(), consulta.data.filtro));
});
