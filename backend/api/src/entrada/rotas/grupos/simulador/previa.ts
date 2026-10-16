import { entradaPrevia } from '@pelada/contrato';
import { Hono } from 'hono';
import { montarPrevia } from '../../../../aplicacao/simulador/previa.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { naoEncontrado } from '../../../erros.js';

/** `POST /api/grupos/:grupoId/simulador/previa`: quantos times saem; sem banco, só conta os aptos. */
export const rotaSimuladorPrevia = new Hono<AppEnv>().post('/api/grupos/:grupoId/simulador/previa', async (c) => {
  if (!c.var.vinculo) return naoEncontrado(c);
  const corpo = await lerCorpo(c, entradaPrevia);
  if (!corpo.ok) return corpo.resposta;
  return c.json(montarPrevia(corpo.dado));
});
