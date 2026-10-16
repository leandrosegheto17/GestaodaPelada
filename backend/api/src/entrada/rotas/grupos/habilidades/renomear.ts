import { CODIGOS_ERRO, habilidade, habilidadeCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { renomearHabilidade } from '../../../../aplicacao/elenco/habilidades.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `PATCH /api/grupos/:grupoId/habilidades/:id`: renomeia com as regras do cadastro; as notas continuam. */
export const rotaHabilidadeRenomear = new Hono<AppEnv>().patch('/api/grupos/:grupoId/habilidades/:id', async (c) => {
  const vinculo = c.var.vinculo;
  const id = uuidDaRota(c, 'id');
  if (!vinculo || id === null) return naoEncontrado(c);
  const corpo = await lerCorpo(c, habilidadeCorpo);
  if (!corpo.ok) return corpo.resposta;
  const r = await renomearHabilidade(c.var.db(), vinculo.grupoId, id, corpo.dado.nome);
  if (r === null) return naoEncontrado(c);
  if (!r.ok) return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
  return c.json(habilidade.parse(r.habilidade));
});
