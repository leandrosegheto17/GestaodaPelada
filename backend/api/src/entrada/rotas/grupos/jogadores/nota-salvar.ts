import { notaCorpo, notaSalva } from '@pelada/contrato';
import { Hono } from 'hono';
import { salvarNota } from '../../../../aplicacao/elenco/salvar-nota.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `PUT /api/grupos/:grupoId/jogadores/:id/notas/:habilidadeId`: nota de 1 a 10, ou `null` para apagar. */
export const rotaNotaSalvar = new Hono<AppEnv>().put(
  '/api/grupos/:grupoId/jogadores/:id/notas/:habilidadeId',
  async (c) => {
    const vinculo = c.var.vinculo;
    const jogadorId = uuidDaRota(c, 'id');
    const habilidadeId = uuidDaRota(c, 'habilidadeId');
    if (!vinculo || jogadorId === null || habilidadeId === null) return naoEncontrado(c);
    const corpo = await lerCorpo(c, notaCorpo);
    if (!corpo.ok) return corpo.resposta;
    const r = await salvarNota(c.var.db(), vinculo.grupoId, jogadorId, habilidadeId, corpo.dado.nota);
    return r === null ? naoEncontrado(c) : c.json(notaSalva.parse(r));
  },
);
