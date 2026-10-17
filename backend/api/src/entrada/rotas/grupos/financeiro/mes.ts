import { CODIGOS_ERRO, mesFinanceiroConsulta } from '@pelada/contrato';
import { Hono } from 'hono';
import { carregarFinanceiroMes } from '../../../../aplicacao/financeiro/mes.js';
import type { AppEnv } from '../../../app.js';
import { corpoErro, naoEncontrado, responderValidacao } from '../../../erros.js';

/** `GET /api/grupos/:grupoId/financeiro/mes?mes=`: o caixa do mês (só para quem tem a permissão do financeiro). */
export const rotaFinanceiroMes = new Hono<AppEnv>().get('/api/grupos/:grupoId/financeiro/mes', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const consulta = mesFinanceiroConsulta.safeParse(c.req.query());
  if (!consulta.success) return responderValidacao(c, consulta.error);
  const r = await carregarFinanceiroMes(c.var.db(), vinculo.grupoId, {
    mes: consulta.data.mes ?? c.var.relogio.mes(),
    hoje: c.var.relogio.hoje(),
  });
  if (r.tipo === 'fora_dos_limites') {
    return c.json(
      corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { mes: 'Mês fora do histórico do caixa.' }),
      422,
    );
  }
  return c.json(r.mes);
});
