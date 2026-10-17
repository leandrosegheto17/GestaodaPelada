import { CODIGOS_ERRO, marcarPagamentoCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { marcarPagamento } from '../../../../aplicacao/financeiro/marcar-pagamento.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { conflito, corpoErro, naoEncontrado } from '../../../erros.js';

/** `POST /api/grupos/:grupoId/financeiro/pagamentos`: marca o pagamento do mês (204; a tela relê o mês). */
export const rotaPagamentoMarcar = new Hono<AppEnv>().post('/api/grupos/:grupoId/financeiro/pagamentos', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const corpo = await lerCorpo(c, marcarPagamentoCorpo);
  if (!corpo.ok) return corpo.resposta;
  const r = await marcarPagamento(c.var.db(), vinculo.grupoId, corpo.dado, {
    autorContaId: sessao.conta.id,
    hoje: c.var.relogio.hoje(),
    agora: new Date(c.var.relogio.agoraIso()),
  });
  if (r.tipo === 'ja_marcado') {
    return conflito(c, CODIGOS_ERRO.pagamentoJaMarcado, 'O pagamento deste mês já está marcado.');
  }
  if (r.tipo === 'invalido') {
    return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
  }
  return c.body(null, 204);
});
