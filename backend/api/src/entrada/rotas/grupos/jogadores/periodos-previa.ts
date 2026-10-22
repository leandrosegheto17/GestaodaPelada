import { periodoCorrigirCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { avaliarPedidoDePeriodos } from '../../../../aplicacao/elenco/avaliacao-periodos.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { naoEncontrado, recusaDeCampo } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `POST /api/grupos/:grupoId/jogadores/:id/periodos/:periodoId/previa`: efeito de corrigir saída e/ou retorno; não grava. */
export const rotaJogadorPeriodoPrevia = new Hono<AppEnv>().post(
  '/api/grupos/:grupoId/jogadores/:id/periodos/:periodoId/previa',
  async (c) => {
    const { vinculo } = c.var;
    const id = uuidDaRota(c, 'id');
    const periodoId = uuidDaRota(c, 'periodoId');
    if (!vinculo || id === null || periodoId === null) return naoEncontrado(c);
    const corpo = await lerCorpo(c, periodoCorrigirCorpo);
    if (!corpo.ok) return corpo.resposta;
    const { saida, retorno } = corpo.dado;

    const r = await avaliarPedidoDePeriodos(
      c.var.db(),
      vinculo.grupoId,
      id,
      {
        operacao: 'corrigir',
        periodoId,
        ...(saida !== undefined ? { saida } : {}),
        ...(retorno !== undefined ? { retorno } : {}),
      },
      { hoje: c.var.relogio.hoje() },
    );
    if (r.tipo === 'nao_encontrado') return naoEncontrado(c);
    if (r.tipo === 'recusa') return c.json(recusaDeCampo(r.campo, r.mensagem), 422);
    return c.json(r.previa);
  },
);
