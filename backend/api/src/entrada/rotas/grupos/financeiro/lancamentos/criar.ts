import { lancamentoCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { criarLancamento } from '../../../../../aplicacao/financeiro/lancamentos/criar.js';
import type { AppEnv } from '../../../../app.js';
import { lerCorpo } from '../../../../corpo.js';
import { naoEncontrado } from '../../../../erros.js';

/** `POST /api/grupos/:grupoId/financeiro/lancamentos`: lançamento avulso de entrada ou saída. */
export const rotaLancamentoCriar = new Hono<AppEnv>().post('/api/grupos/:grupoId/financeiro/lancamentos', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const corpo = await lerCorpo(c, lancamentoCorpo);
  if (!corpo.ok) return corpo.resposta;
  const criado = await criarLancamento(c.var.db(), vinculo.grupoId, corpo.dado, {
    autorContaId: sessao.conta.id,
    agora: new Date(c.var.relogio.agoraIso()),
  });
  return c.json(criado, 201);
});
