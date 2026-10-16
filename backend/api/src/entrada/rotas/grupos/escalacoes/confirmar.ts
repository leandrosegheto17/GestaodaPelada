import { CODIGOS_ERRO, escalacaoCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { confirmarEscalacao } from '../../../../aplicacao/simulador/confirmar-escalacao.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';

/** `POST /api/grupos/:grupoId/escalacoes`: confirma a escalação da data (substitui a anterior). */
export const rotaEscalacaoConfirmar = new Hono<AppEnv>().post('/api/grupos/:grupoId/escalacoes', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const corpo = await lerCorpo(c, escalacaoCorpo);
  if (!corpo.ok) return corpo.resposta;
  const r = await confirmarEscalacao(c.var.db(), vinculo.grupoId, corpo.dado, {
    contaId: sessao.conta.id,
    agora: new Date(c.var.relogio.agoraIso()),
  });
  if (!r.ok) return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
  return c.json(r.confirmada, 201);
});
