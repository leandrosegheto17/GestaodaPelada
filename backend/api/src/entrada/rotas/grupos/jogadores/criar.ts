import { CODIGOS_ERRO, jogadorCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { criarJogador } from '../../../../aplicacao/elenco/criar-jogador.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';

/** `POST /api/grupos/:grupoId/jogadores`: cria o jogador (limites do contrato, ano máximo pelo hoje do servidor). */
export const rotaJogadorCriar = new Hono<AppEnv>().post('/api/grupos/:grupoId/jogadores', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const hoje = c.var.relogio.hoje();
  const corpo = await lerCorpo(c, jogadorCorpo(hoje));
  if (!corpo.ok) return corpo.resposta;

  const r = await criarJogador(c.var.db(), vinculo.grupoId, corpo.dado, {
    hoje,
    autor: sessao.conta.id,
    agora: new Date(c.var.relogio.agoraIso()),
  });
  if (!r.ok) return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
  return c.json(r.jogador, 201);
});
