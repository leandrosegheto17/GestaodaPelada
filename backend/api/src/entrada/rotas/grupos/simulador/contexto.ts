import { contextoConsulta } from '@pelada/contrato';
import { Hono } from 'hono';
import { prepararContexto } from '../../../../aplicacao/simulador/contexto.js';
import type { AppEnv } from '../../../app.js';
import { naoEncontrado, responderValidacao } from '../../../erros.js';

/** `GET /api/grupos/:grupoId/simulador/contexto?data=`: ativos na data com o nível de cada um. */
export const rotaSimuladorContexto = new Hono<AppEnv>().get('/api/grupos/:grupoId/simulador/contexto', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const consulta = contextoConsulta.safeParse(c.req.query());
  if (!consulta.success) return responderValidacao(c, consulta.error);
  const contexto = await prepararContexto(c.var.db(), vinculo.grupoId, {
    data: consulta.data.data,
    hoje: c.var.relogio.hoje(),
  });
  return contexto ? c.json(contexto) : naoEncontrado(c);
});
