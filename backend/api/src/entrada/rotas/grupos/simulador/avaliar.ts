import { CODIGOS_ERRO, avaliarCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { avaliarComposicao } from '../../../../aplicacao/simulador/avaliar.js';
import { AptoInvalido } from '../../../../aplicacao/simulador/entrada.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado, responderAptoInvalido } from '../../../erros.js';

/** `POST /api/grupos/:grupoId/simulador/avaliar`: indicadores, pares e avisos da composição editada. */
export const rotaSimuladorAvaliar = new Hono<AppEnv>().post('/api/grupos/:grupoId/simulador/avaliar', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const corpo = await lerCorpo(c, avaliarCorpo);
  if (!corpo.ok) return corpo.resposta;
  try {
    const r = await avaliarComposicao(c.var.db(), vinculo.grupoId, corpo.dado);
    if (!r.ok) return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
    return c.json(r.avaliacao);
  } catch (erro) {
    if (erro instanceof AptoInvalido) return responderAptoInvalido(c);
    throw erro;
  }
});
