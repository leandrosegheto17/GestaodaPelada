import { avisoPrivacidadeCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { marcarAvisoPrivacidadeVisto } from '../../aplicacao/acesso/aviso-privacidade.js';
import type { AppEnv } from '../app.js';
import { lerCorpo } from '../corpo.js';
import { exigirSessaoCompleta } from '../middlewares/sessao.js';

/** `POST /api/sessao/aviso-privacidade`: a conta da sessão viu o aviso; 204. Corpo ausente ou `{}`. */
export const rotaSessaoAvisoPrivacidade = new Hono<AppEnv>().post(
  '/api/sessao/aviso-privacidade',
  exigirSessaoCompleta,
  async (c) => {
    const sessao = c.var.sessao;
    if (sessao === null) return c.body(null, 401);
    if ((await c.req.text()).trim() !== '') {
      const corpo = await lerCorpo(c, avisoPrivacidadeCorpo);
      if (!corpo.ok) return corpo.resposta;
    }
    await marcarAvisoPrivacidadeVisto(c.var.db(), sessao.conta.id, new Date(c.var.relogio.agoraIso()));
    return c.body(null, 204);
  },
);
