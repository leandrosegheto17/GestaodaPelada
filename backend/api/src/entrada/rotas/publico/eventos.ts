import { LIMITES, eventoPublicoCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { buscarGrupoPublico } from '../../../aplicacao/publico/grupo-por-slug.js';
import { registrarEventoPublico } from '../../../aplicacao/publico/eventos.js';
import type { AppEnv } from '../../app.js';
import { lerCorpo } from '../../corpo.js';
import { corpoGrande, naoEncontrado } from '../../erros.js';

/** `POST /api/publico/:slug/eventos`: evento anônimo de uso (corpo de até 1 KB; 204). */
export const rotaPublicoEventos = new Hono<AppEnv>().post(
  '/api/publico/:slug/eventos',
  bodyLimit({ maxSize: LIMITES.corpoPublicoBytes, onError: (c) => corpoGrande(c) }),
  async (c) => {
    const corpo = await lerCorpo(c, eventoPublicoCorpo);
    if (!corpo.ok) return corpo.resposta;
    const db = c.var.db();
    const grupo = await buscarGrupoPublico(db, c.req.param('slug'));
    if (!grupo) return naoEncontrado(c);
    await registrarEventoPublico(db, grupo.id, corpo.dado, new Date(c.var.relogio.agoraIso()));
    return c.body(null, 204);
  },
);
