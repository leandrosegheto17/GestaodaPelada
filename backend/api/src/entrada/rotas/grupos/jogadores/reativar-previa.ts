import { CODIGOS_ERRO, reativarPreviaCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { avaliarPedidoDePeriodos } from '../../../../aplicacao/elenco/avaliacao-periodos.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { conflito, naoEncontrado, recusaDeCampo } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `POST /api/grupos/:grupoId/jogadores/:id/reativar/previa`: efeito de reativar com retorno retroativo; não grava. */
export const rotaJogadorReativarPrevia = new Hono<AppEnv>().post(
  '/api/grupos/:grupoId/jogadores/:id/reativar/previa',
  async (c) => {
    const { vinculo } = c.var;
    const id = uuidDaRota(c, 'id');
    if (!vinculo || id === null) return naoEncontrado(c);
    const corpo = await lerCorpo(c, reativarPreviaCorpo);
    if (!corpo.ok) return corpo.resposta;

    const r = await avaliarPedidoDePeriodos(
      c.var.db(),
      vinculo.grupoId,
      id,
      { operacao: 'reativar', dataRetorno: corpo.dado.dataRetorno },
      { hoje: c.var.relogio.hoje() },
    );
    switch (r.tipo) {
      case 'nao_encontrado':
        return naoEncontrado(c);
      case 'ja_ativo':
        return conflito(c, CODIGOS_ERRO.jogadorJaAtivo, 'O jogador já está ativo.');
      case 'recusa':
        return c.json(recusaDeCampo(r.campo, r.mensagem), 422);
      case 'nada_a_alterar':
      case 'ok':
        return c.json(r.previa);
    }
  },
);
