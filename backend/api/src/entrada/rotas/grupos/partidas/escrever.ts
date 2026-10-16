import { CODIGOS_ERRO, salvarPartidaCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { PartidaNaoEncontrada, editarPartida } from '../../../../aplicacao/partidas/editar.js';
import { excluirPartida } from '../../../../aplicacao/partidas/excluir.js';
import { lancarPartida } from '../../../../aplicacao/partidas/lancar.js';
import { MarcacaoInvalida } from '../../../../aplicacao/partidas/presencas.js';
import { PartidaDuplicada } from '../../../../infraestrutura/db/repositorios/partidas.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';
import { dataDoCaminho } from '../../../parametros.js';
import { respostaMarcacaoInvalida, respostaPartidaDuplicada } from '../../../respostas-partida.js';

/** `POST /api/grupos/:grupoId/partidas`: lança a partida (201 com a partida gravada). */
export const rotaPartidaSalvar = new Hono<AppEnv>().post('/api/grupos/:grupoId/partidas', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const hoje = c.var.relogio.hoje();
  const corpo = await lerCorpo(c, salvarPartidaCorpo(hoje));
  if (!corpo.ok) return corpo.resposta;
  try {
    const partida = await lancarPartida(c.var.db(), vinculo.grupoId, corpo.dado, {
      autorContaId: sessao.conta.id,
      agora: new Date(c.var.relogio.agoraIso()),
      hoje,
    });
    return c.json(partida, 201);
  } catch (erro) {
    if (erro instanceof PartidaDuplicada) return respostaPartidaDuplicada(c, corpo.dado.data);
    if (erro instanceof MarcacaoInvalida) return respostaMarcacaoInvalida(c, erro);
    throw erro;
  }
});

/** `PUT /api/grupos/:grupoId/partidas/:data`: substitui `choveu` e as presenças (a data não muda). */
export const rotaPartidaEditar = new Hono<AppEnv>().put('/api/grupos/:grupoId/partidas/:data{[0-9-]+}', async (c) => {
  const { vinculo, sessao } = c.var;
  const data = dataDoCaminho(c);
  if (!vinculo || !sessao || data === null) return naoEncontrado(c);
  const hoje = c.var.relogio.hoje();
  const corpo = await lerCorpo(c, salvarPartidaCorpo(hoje));
  if (!corpo.ok) return corpo.resposta;
  if (corpo.dado.data !== data) {
    return c.json(
      corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', {
        data: 'A data da partida não pode ser alterada.',
      }),
      422,
    );
  }
  try {
    return c.json(
      await editarPartida(c.var.db(), vinculo.grupoId, data, corpo.dado, {
        autorContaId: sessao.conta.id,
        agora: new Date(c.var.relogio.agoraIso()),
        hoje,
      }),
    );
  } catch (erro) {
    if (erro instanceof PartidaNaoEncontrada) return naoEncontrado(c);
    if (erro instanceof MarcacaoInvalida) return respostaMarcacaoInvalida(c, erro);
    throw erro;
  }
});

/** `DELETE /api/grupos/:grupoId/partidas/:data`: exclui a partida e as presenças (204). */
export const rotaPartidaExcluir = new Hono<AppEnv>().delete(
  '/api/grupos/:grupoId/partidas/:data{[0-9-]+}',
  async (c) => {
    const { vinculo, sessao } = c.var;
    const data = dataDoCaminho(c);
    if (!vinculo || !sessao || data === null) return naoEncontrado(c);
    try {
      await excluirPartida(c.var.db(), vinculo.grupoId, data, {
        autorContaId: sessao.conta.id,
        agora: new Date(c.var.relogio.agoraIso()),
      });
      return c.body(null, 204);
    } catch (erro) {
      if (erro instanceof PartidaNaoEncontrada) return naoEncontrado(c);
      throw erro;
    }
  },
);
