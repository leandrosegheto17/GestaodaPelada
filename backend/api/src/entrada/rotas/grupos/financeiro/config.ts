import { CODIGOS_ERRO, configFinanceiraCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { salvarConfigFinanceira } from '../../../../aplicacao/financeiro/config.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';

/** `PUT /api/grupos/:grupoId/financeiro/config`: mensalidade opcional, saldo inicial e a data dele. */
export const rotaFinanceiroConfig = new Hono<AppEnv>().put('/api/grupos/:grupoId/financeiro/config', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const corpo = await lerCorpo(c, configFinanceiraCorpo);
  if (!corpo.ok) return corpo.resposta;
  const r = await salvarConfigFinanceira(c.var.db(), vinculo.grupoId, corpo.dado, {
    autorContaId: sessao.conta.id,
    hoje: c.var.relogio.hoje(),
    agora: new Date(c.var.relogio.agoraIso()),
  });
  if (!r.ok) return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
  return c.json(r.config);
});
