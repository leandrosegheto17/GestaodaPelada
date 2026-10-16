import { novosPesosCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { montarPainelPesos } from '../../../../aplicacao/pesos/painel.js';
import { salvarPesos } from '../../../../aplicacao/pesos/salvar.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { naoEncontrado } from '../../../erros.js';

/** `GET /api/grupos/:grupoId/pesos`: pesos em vigor e histórico. */
export const rotaPesosLer = new Hono<AppEnv>().get('/api/grupos/:grupoId/pesos', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  return c.json(await montarPainelPesos(c.var.db(), vinculo.grupoId, c.var.relogio.hoje()));
});

/** `POST /api/grupos/:grupoId/pesos`: nova configuração, vigente a partir de hoje (sem campo de data). */
export const rotaPesosSalvar = new Hono<AppEnv>().post('/api/grupos/:grupoId/pesos', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const corpo = await lerCorpo(c, novosPesosCorpo);
  if (!corpo.ok) return corpo.resposta;
  return c.json(
    await salvarPesos(c.var.db(), vinculo.grupoId, {
      pesos: corpo.dado,
      contaId: sessao.conta.id,
      hoje: c.var.relogio.hoje(),
      agora: new Date(c.var.relogio.agoraIso()),
    }),
  );
});
