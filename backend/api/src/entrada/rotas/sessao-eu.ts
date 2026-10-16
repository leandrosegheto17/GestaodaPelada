import { Hono } from 'hono';
import { montarSessaoEu } from '../../aplicacao/acesso/sessao-eu.js';
import type { AppEnv } from '../app.js';
import { exigirSessao } from '../middlewares/sessao.js';

/** `GET /api/sessao/eu`: conta, escopo e grupos da sessão (aceita os dois escopos). */
export const rotaSessaoEu = new Hono<AppEnv>().get('/api/sessao/eu', exigirSessao, async (c) => {
  const sessao = c.var.sessao;
  if (sessao === null) return c.body(null, 401);
  return c.json(await montarSessaoEu(c.var.db(), sessao, c.var.config));
});
