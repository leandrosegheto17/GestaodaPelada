import { CODIGOS_ERRO, jogadorCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { editarJogador } from '../../../../aplicacao/elenco/editar-jogador.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `PATCH /api/grupos/:grupoId/jogadores/:id`: edita os dados do jogador (os mesmos campos do cadastro). */
export const rotaJogadorEditar = new Hono<AppEnv>().patch('/api/grupos/:grupoId/jogadores/:id', async (c) => {
  const { vinculo, sessao } = c.var;
  const id = uuidDaRota(c, 'id');
  if (!vinculo || !sessao || id === null) return naoEncontrado(c);
  const hoje = c.var.relogio.hoje();
  const corpo = await lerCorpo(c, jogadorCorpo(hoje));
  if (!corpo.ok) return corpo.resposta;

  const r = await editarJogador(c.var.db(), vinculo.grupoId, id, corpo.dado, {
    hoje,
    autor: sessao.conta.id,
    agora: new Date(c.var.relogio.agoraIso()),
  });
  if (r.ok) return c.json(r.jogador);
  if ('naoEncontrado' in r) return naoEncontrado(c);
  return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
});
