import { CODIGOS_ERRO, erroJogadorComHistorico } from '@pelada/contrato';
import { Hono } from 'hono';
import { excluirJogador } from '../../../../aplicacao/elenco/excluir.js';
import type { AppEnv } from '../../../app.js';
import { naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `DELETE /api/grupos/:grupoId/jogadores/:id`: só sem presença nem nota (204); senão 409 sugerindo inativar. */
export const rotaJogadorExcluir = new Hono<AppEnv>().delete('/api/grupos/:grupoId/jogadores/:id', async (c) => {
  const { vinculo, sessao } = c.var;
  const id = uuidDaRota(c, 'id');
  if (!vinculo || !sessao || id === null) return naoEncontrado(c);
  const r = await excluirJogador(c.var.db(), vinculo.grupoId, id, {
    autorContaId: sessao.conta.id,
    agora: new Date(c.var.relogio.agoraIso()),
  });
  if (r.tipo === 'ok') return c.body(null, 204);
  if (r.tipo === 'nao_encontrado') return naoEncontrado(c);
  return c.json(
    erroJogadorComHistorico.parse({
      erro: {
        codigo: CODIGOS_ERRO.jogadorComHistorico,
        mensagem: `${r.apelido} tem histórico de partidas e não pode ser excluído.`,
        sugestao: 'inativar',
      },
    }),
    409,
  );
});
