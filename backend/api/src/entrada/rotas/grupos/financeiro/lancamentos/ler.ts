import { Hono } from 'hono';
import { lerLancamento } from '../../../../../aplicacao/financeiro/lancamentos/ler.js';
import type { AppEnv } from '../../../../app.js';
import { naoEncontrado } from '../../../../erros.js';
import { uuidDaRota } from '../../../../parametros.js';

/** `GET /api/grupos/:grupoId/financeiro/lancamentos/:id`: um lançamento, com quem o alterou por último. */
export const rotaLancamentoLer = new Hono<AppEnv>().get(
  '/api/grupos/:grupoId/financeiro/lancamentos/:id',
  async (c) => {
    const vinculo = c.var.vinculo;
    const id = uuidDaRota(c, 'id');
    if (!vinculo || id === null) return naoEncontrado(c);
    const l = await lerLancamento(c.var.db(), vinculo.grupoId, id);
    return l ? c.json(l) : naoEncontrado(c);
  },
);
