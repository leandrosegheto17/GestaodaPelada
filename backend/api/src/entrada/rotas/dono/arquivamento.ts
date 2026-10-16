import { CODIGOS_ERRO, arquivarGrupoCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import {
  arquivarGrupo,
  GrupoNaoEncontrado,
  NomeNaoConfere,
  reativarGrupo,
} from '../../../aplicacao/dono/arquivamento.js';
import { carregarGrupoDono } from '../../../aplicacao/dono/grupo-dono.js';
import type { AppEnv } from '../../app.js';
import { lerCorpo } from '../../corpo.js';
import { corpoErro, naoEncontrado } from '../../erros.js';
import { uuidDaRota } from '../../parametros.js';

/** `POST /api/dono/grupos/:id/arquivar`: exige o nome exato do grupo; responde o grupo atualizado. */
export const rotaDonoArquivar = new Hono<AppEnv>().post('/api/dono/grupos/:id/arquivar', async (c) => {
  const id = uuidDaRota(c, 'id');
  const dono = c.var.sessao;
  if (id === null || dono === null) return naoEncontrado(c);
  const corpo = await lerCorpo(c, arquivarGrupoCorpo);
  if (!corpo.ok) return corpo.resposta;

  const db = c.var.db();
  try {
    await arquivarGrupo(db, id, {
      nomeConfirmacao: corpo.dado.nomeConfirmacao,
      autorId: dono.conta.id,
      agora: new Date(c.var.relogio.agoraIso()),
    });
  } catch (erro) {
    if (erro instanceof GrupoNaoEncontrado) return naoEncontrado(c);
    if (erro instanceof NomeNaoConfere) {
      return c.json(
        corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', {
          nomeConfirmacao: 'O nome digitado não confere com o nome do grupo.',
        }),
        422,
      );
    }
    throw erro;
  }
  const grupo = await carregarGrupoDono(db, c.var.config.urlPublica, id);
  return grupo ? c.json(grupo) : naoEncontrado(c);
});

/** `POST /api/dono/grupos/:id/reativar`: sem corpo; responde o grupo atualizado. */
export const rotaDonoReativar = new Hono<AppEnv>().post('/api/dono/grupos/:id/reativar', async (c) => {
  const id = uuidDaRota(c, 'id');
  const dono = c.var.sessao;
  if (id === null || dono === null) return naoEncontrado(c);
  const db = c.var.db();
  try {
    await reativarGrupo(db, id, { autorId: dono.conta.id, agora: new Date(c.var.relogio.agoraIso()) });
  } catch (erro) {
    if (erro instanceof GrupoNaoEncontrado) return naoEncontrado(c);
    throw erro;
  }
  const grupo = await carregarGrupoDono(db, c.var.config.urlPublica, id);
  return grupo ? c.json(grupo) : naoEncontrado(c);
});
