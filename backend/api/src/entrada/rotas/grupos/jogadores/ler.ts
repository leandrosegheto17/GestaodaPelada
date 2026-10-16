import { Hono } from 'hono';
import { carregarDetalhe } from '../../../../aplicacao/elenco/detalhe.js';
import type { AppEnv } from '../../../app.js';
import { naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `GET /api/grupos/:grupoId/jogadores/:id`: dados, situação, notas do catálogo e nível. */
export const rotaJogadorLer = new Hono<AppEnv>().get('/api/grupos/:grupoId/jogadores/:id', async (c) => {
  const vinculo = c.var.vinculo;
  const id = uuidDaRota(c, 'id');
  if (!vinculo || id === null) return naoEncontrado(c);
  const jogador = await carregarDetalhe(c.var.db(), vinculo.grupoId, id, c.var.relogio.hoje());
  return jogador ? c.json(jogador) : naoEncontrado(c);
});
