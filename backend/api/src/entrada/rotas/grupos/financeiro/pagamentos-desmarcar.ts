import { CODIGOS_ERRO, mes as esquemaMes } from '@pelada/contrato';
import { Hono } from 'hono';
import { desmarcarPagamento } from '../../../../aplicacao/financeiro/desmarcar-pagamento.js';
import type { AppEnv } from '../../../app.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `DELETE /api/grupos/:grupoId/financeiro/pagamentos/:jogadorId/:mes`: desmarca e remove a entrada vinculada. */
export const rotaPagamentoDesmarcar = new Hono<AppEnv>().delete(
  '/api/grupos/:grupoId/financeiro/pagamentos/:jogadorId/:mes',
  async (c) => {
    const { vinculo, sessao } = c.var;
    const jogadorId = uuidDaRota(c, 'jogadorId');
    if (!vinculo || !sessao || jogadorId === null) return naoEncontrado(c);
    const mes = esquemaMes.safeParse(c.req.param('mes'));
    if (!mes.success) {
      return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { mes: 'Mês inválido.' }), 422);
    }
    const removeu = await desmarcarPagamento(
      c.var.db(),
      vinculo.grupoId,
      { jogadorId, mes: mes.data },
      { autorContaId: sessao.conta.id, agora: new Date(c.var.relogio.agoraIso()) },
    );
    return removeu ? c.body(null, 204) : naoEncontrado(c);
  },
);
