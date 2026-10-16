import { criarGrupoCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { criarGrupo } from '../../../aplicacao/dono/criar-grupo.js';
import type { AppEnv } from '../../app.js';
import { lerCorpo } from '../../corpo.js';

/** `POST /api/dono/grupos`: cria o grupo e o primeiro admin (senha temporária exibida uma vez). */
export const rotaDonoCriarGrupo = new Hono<AppEnv>().post('/api/dono/grupos', async (c) => {
  const dono = c.var.sessao;
  if (dono === null) return c.body(null, 401);
  const corpo = await lerCorpo(c, criarGrupoCorpo);
  if (!corpo.ok) return corpo.resposta;

  const criado = await criarGrupo(c.var.db(), {
    corpo: corpo.dado,
    autorContaId: dono.conta.id,
    hoje: c.var.relogio.hoje(),
    agora: new Date(c.var.relogio.agoraIso()),
    urlPublica: c.var.config.urlPublica,
  });
  return c.json(criado, 201);
});
