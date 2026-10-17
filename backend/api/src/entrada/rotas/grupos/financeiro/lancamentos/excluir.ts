import { CODIGOS_ERRO } from '@pelada/contrato';
import { Hono } from 'hono';
import {
  excluirLancamento,
  MSG_LANCAMENTO_VINCULADO,
} from '../../../../../aplicacao/financeiro/lancamentos/excluir.js';
import type { AppEnv } from '../../../../app.js';
import { conflito, naoEncontrado } from '../../../../erros.js';
import { uuidDaRota } from '../../../../parametros.js';

/** `DELETE /api/grupos/:grupoId/financeiro/lancamentos/:id`: exclui (204); a mensalidade vinculada dá 409. */
export const rotaLancamentoExcluir = new Hono<AppEnv>().delete(
  '/api/grupos/:grupoId/financeiro/lancamentos/:id',
  async (c) => {
    const { vinculo, sessao } = c.var;
    const id = uuidDaRota(c, 'id');
    if (!vinculo || !sessao || id === null) return naoEncontrado(c);
    const r = await excluirLancamento(c.var.db(), vinculo.grupoId, id, {
      autorContaId: sessao.conta.id,
      agora: new Date(c.var.relogio.agoraIso()),
    });
    if (r.tipo === 'nao_encontrado') return naoEncontrado(c);
    if (r.tipo === 'vinculado') return conflito(c, CODIGOS_ERRO.lancamentoVinculado, MSG_LANCAMENTO_VINCULADO);
    return c.body(null, 204);
  },
);
