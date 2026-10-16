import { situacaoComercialCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { carregarGrupoDono } from '../../../aplicacao/dono/grupo-dono.js';
import * as grupos from '../../../infraestrutura/db/repositorios/grupos.js';
import type { AppEnv } from '../../app.js';
import { lerCorpo } from '../../corpo.js';
import { naoEncontrado } from '../../erros.js';
import { uuidDaRota } from '../../parametros.js';

/** `PATCH /api/dono/grupos/:id/situacao`: muda só a situação comercial (e o início do trial). */
export const rotaDonoSituacao = new Hono<AppEnv>().patch('/api/dono/grupos/:id/situacao', async (c) => {
  const id = uuidDaRota(c, 'id');
  if (id === null) return naoEncontrado(c);
  const corpo = await lerCorpo(c, situacaoComercialCorpo);
  if (!corpo.ok) return corpo.resposta;

  const db = c.var.db();
  const alterado = await grupos.alterarSituacao(db, id, {
    situacao: corpo.dado.situacaoComercial,
    trialInicio: corpo.dado.inicioTrial,
  });
  if (!alterado) return naoEncontrado(c);
  const grupo = await carregarGrupoDono(db, c.var.config.urlPublica, id);
  return grupo ? c.json(grupo) : naoEncontrado(c);
});
