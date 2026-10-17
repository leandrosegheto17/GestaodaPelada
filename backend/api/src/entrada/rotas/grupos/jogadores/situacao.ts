import { CODIGOS_ERRO, inativarCorpo, reativarCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { inativarJogador } from '../../../../aplicacao/elenco/inativar.js';
import { MSG_PRESENCA_DESDE_A_SAIDA } from '../../../../aplicacao/elenco/mensagens.js';
import { reativarJogador } from '../../../../aplicacao/elenco/reativar.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { conflito, corpoErro, naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `POST /api/grupos/:grupoId/jogadores/:id/inativar`: data de saída (padrão hoje, nunca futura). */
export const rotaJogadorInativar = new Hono<AppEnv>().post('/api/grupos/:grupoId/jogadores/:id/inativar', async (c) => {
  const vinculo = c.var.vinculo;
  const id = uuidDaRota(c, 'id');
  if (!vinculo || id === null) return naoEncontrado(c);
  const hoje = c.var.relogio.hoje();
  const corpo = await lerCorpo(c, inativarCorpo(hoje));
  if (!corpo.ok) return corpo.resposta;

  const r = await inativarJogador(c.var.db(), vinculo.grupoId, id, corpo.dado.dataSaida ?? hoje, hoje);
  switch (r.tipo) {
    case 'ok':
      return c.json(r.jogador);
    case 'nao_encontrado':
      return naoEncontrado(c);
    case 'ja_inativo':
      return conflito(c, CODIGOS_ERRO.jogadorJaInativo, 'O jogador já está inativo.');
    case 'saida_antes_da_entrada':
      return c.json(
        corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', {
          dataSaida: 'A data de saída não pode ser anterior à entrada.',
        }),
        422,
      );
    case 'presenca_desde_a_saida':
      return c.json(
        corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { dataSaida: MSG_PRESENCA_DESDE_A_SAIDA }),
        422,
      );
  }
});

/** `POST /api/grupos/:grupoId/jogadores/:id/reativar`: abre um período a partir de hoje (sem corpo). */
export const rotaJogadorReativar = new Hono<AppEnv>().post('/api/grupos/:grupoId/jogadores/:id/reativar', async (c) => {
  const vinculo = c.var.vinculo;
  const id = uuidDaRota(c, 'id');
  if (!vinculo || id === null) return naoEncontrado(c);
  if ((await c.req.text()).trim() !== '') {
    const corpo = await lerCorpo(c, reativarCorpo);
    if (!corpo.ok) return corpo.resposta;
  }
  const r = await reativarJogador(c.var.db(), vinculo.grupoId, id, c.var.relogio.hoje());
  switch (r.tipo) {
    case 'ok':
      return c.json(r.jogador);
    case 'nao_encontrado':
      return naoEncontrado(c);
    case 'ja_ativo':
      return conflito(c, CODIGOS_ERRO.jogadorJaAtivo, 'O jogador já está ativo.');
    case 'data_invalida':
      return c.json(
        corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', { corpo: 'Data inválida para reativar.' }),
        422,
      );
  }
});
