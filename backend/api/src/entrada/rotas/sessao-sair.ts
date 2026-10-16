import { Hono } from 'hono';
import { encerrarSessao } from '../../aplicacao/acesso/sessao.js';
import { lerTokenSessao, limparCookieSessao } from '../../infraestrutura/sessao/cookie.js';
import type { AppEnv } from '../app.js';

/** `POST /api/sessao/sair`: encerra só a sessão deste aparelho; sempre 204 e cookie limpo. */
export const rotaSessaoSair = new Hono<AppEnv>().post('/api/sessao/sair', async (c) => {
  const token = lerTokenSessao(c);
  if (token !== null && c.var.sessao !== null) await encerrarSessao(c.var.db(), token);
  limparCookieSessao(c);
  return c.body(null, 204);
});
