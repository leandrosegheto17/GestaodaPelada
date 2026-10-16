import { data as esquemaData } from '@pelada/contrato';
import { Hono } from 'hono';
import { carregarPartida } from '../../../../aplicacao/partidas/detalhe.js';
import type { AppEnv } from '../../../app.js';
import { naoEncontrado } from '../../../erros.js';

/**
 * `GET /api/grupos/:grupoId/partidas/:data`: a partida, as presenças e a última alteração. O padrão
 * do parâmetro (só dígitos e hífen) impede que `nova` caia aqui; data impossível dá 404 sem consulta.
 */
export const rotaPartidaLer = new Hono<AppEnv>().get('/api/grupos/:grupoId/partidas/:data{[0-9-]+}', async (c) => {
  const vinculo = c.var.vinculo;
  const data = esquemaData.safeParse(c.req.param('data'));
  if (!vinculo || !data.success) return naoEncontrado(c);
  const partida = await carregarPartida(c.var.db(), vinculo.grupoId, data.data, c.var.relogio.hoje());
  return partida ? c.json(partida) : naoEncontrado(c);
});
