import { Hono } from 'hono';
import * as pedidos from '../../../infraestrutura/db/repositorios/pedidos-reset.js';
import type { AppEnv } from '../../app.js';
import { naoEncontrado } from '../../erros.js';
import { uuidDaRota } from '../../parametros.js';

/**
 * `POST /api/dono/pedidos-reset/:id/resolver`: `:id` é a conta (há no máximo um pedido pendente
 * por conta). 204 ao resolver; sem pedido pendente, 404.
 */
export const rotaDonoResolverPedido = new Hono<AppEnv>().post('/api/dono/pedidos-reset/:id/resolver', async (c) => {
  const contaId = uuidDaRota(c, 'id');
  const dono = c.var.sessao;
  if (contaId === null || dono === null) return naoEncontrado(c);
  const resolvido = await pedidos.resolverPorConta(c.var.db(), contaId, {
    resolvidoPor: dono.conta.id,
    agora: new Date(c.var.relogio.agoraIso()),
  });
  return resolvido ? c.body(null, 204) : naoEncontrado(c);
});
