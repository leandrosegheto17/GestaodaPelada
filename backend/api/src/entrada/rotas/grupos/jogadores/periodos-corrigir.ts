import { periodoCorrigirCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { corrigirPeriodoDoJogador } from '../../../../aplicacao/elenco/periodos-corrigir.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { naoEncontrado, recusaDeCampo } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `PUT /api/grupos/:grupoId/jogadores/:id/periodos/:periodoId`: corrige saída e/ou retorno (datas iguais: nada é gravado). */
export const rotaJogadorPeriodoCorrigir = new Hono<AppEnv>().put(
  '/api/grupos/:grupoId/jogadores/:id/periodos/:periodoId',
  async (c) => {
    const { vinculo, sessao } = c.var;
    const id = uuidDaRota(c, 'id');
    const periodoId = uuidDaRota(c, 'periodoId');
    if (!vinculo || !sessao || id === null || periodoId === null) return naoEncontrado(c);
    const corpo = await lerCorpo(c, periodoCorrigirCorpo);
    if (!corpo.ok) return corpo.resposta;

    const r = await corrigirPeriodoDoJogador(c.var.db(), vinculo.grupoId, id, periodoId, corpo.dado, {
      hoje: c.var.relogio.hoje(),
      autor: sessao.conta.id,
      agora: new Date(c.var.relogio.agoraIso()),
    });
    if (r.tipo === 'nao_encontrado') return naoEncontrado(c);
    if (r.tipo === 'invalida') return c.json(recusaDeCampo(r.campo, r.mensagem), 422);
    return c.json(r.resposta);
  },
);
