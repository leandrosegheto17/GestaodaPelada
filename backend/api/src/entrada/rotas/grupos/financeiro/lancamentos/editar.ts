import { CODIGOS_ERRO, lancamentoCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { editarLancamento } from '../../../../../aplicacao/financeiro/lancamentos/editar.js';
import type { AppEnv } from '../../../../app.js';
import { lerCorpo } from '../../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../../erros.js';
import { uuidDaRota } from '../../../../parametros.js';

/** `PUT /api/grupos/:grupoId/financeiro/lancamentos/:id`: troca os campos do lançamento (mesmo corpo do POST). */
export const rotaLancamentoEditar = new Hono<AppEnv>().put(
  '/api/grupos/:grupoId/financeiro/lancamentos/:id',
  async (c) => {
    const { vinculo, sessao } = c.var;
    const id = uuidDaRota(c, 'id');
    if (!vinculo || !sessao || id === null) return naoEncontrado(c);
    const corpo = await lerCorpo(c, lancamentoCorpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await editarLancamento(c.var.db(), vinculo.grupoId, id, corpo.dado, {
      autorContaId: sessao.conta.id,
      agora: new Date(c.var.relogio.agoraIso()),
    });
    if (r.tipo === 'nao_encontrado') return naoEncontrado(c);
    if (r.tipo === 'invalido') {
      return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
    }
    return c.json(r.lancamento);
  },
);
