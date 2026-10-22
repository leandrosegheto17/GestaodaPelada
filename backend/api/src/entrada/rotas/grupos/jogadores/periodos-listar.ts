import { Hono } from 'hono';
import { listarPeriodos } from '../../../../aplicacao/elenco/periodos-listar.js';
import type { AppEnv } from '../../../app.js';
import { naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `GET /api/grupos/:grupoId/jogadores/:id/periodos`: períodos do jogador e o que cada um permite corrigir. */
export const rotaJogadorPeriodosListar = new Hono<AppEnv>().get(
  '/api/grupos/:grupoId/jogadores/:id/periodos',
  async (c) => {
    const vinculo = c.var.vinculo;
    const id = uuidDaRota(c, 'id');
    if (!vinculo || id === null) return naoEncontrado(c);
    const resposta = await listarPeriodos(c.var.db(), vinculo.grupoId, id);
    return resposta ? c.json(resposta) : naoEncontrado(c);
  },
);
