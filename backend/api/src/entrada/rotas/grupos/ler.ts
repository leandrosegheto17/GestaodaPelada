import { Hono } from 'hono';
import { carregarGrupoDetalhe } from '../../../aplicacao/grupos/detalhe.js';
import type { AppEnv } from '../../app.js';
import { naoEncontrado } from '../../erros.js';

/** `GET /api/grupos/:grupoId`: o grupo, as permissões de quem pede e o resumo do início. */
export const rotaGrupoLer = new Hono<AppEnv>().get('/api/grupos/:grupoId', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const detalhe = await carregarGrupoDetalhe(c.var.db(), {
    grupoId: vinculo.grupoId,
    acessaFinanceiro: vinculo.acessaFinanceiro,
    hoje: c.var.relogio.hoje(),
    urlPublica: c.var.config.urlPublica,
  });
  return detalhe ? c.json(detalhe) : naoEncontrado(c);
});
