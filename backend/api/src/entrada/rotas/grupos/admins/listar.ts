import { Hono } from 'hono';
import { montarListaAdmins } from '../../../../aplicacao/grupos/admins/lista.js';
import type { AppEnv } from '../../../app.js';
import { naoEncontrado } from '../../../erros.js';

/** `GET /api/grupos/:grupoId/admins`: admins do grupo e se quem pede gere o financeiro. */
export const rotaAdminsListar = new Hono<AppEnv>().get('/api/grupos/:grupoId/admins', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const lista = await montarListaAdmins(c.var.db(), vinculo.grupoId, {
    contaId: sessao.conta.id,
    acessaFinanceiro: vinculo.acessaFinanceiro,
  });
  return c.json(lista);
});
