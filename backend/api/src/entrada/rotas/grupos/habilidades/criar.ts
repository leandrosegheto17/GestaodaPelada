import { CODIGOS_ERRO, habilidade, habilidadeCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { criarHabilidade } from '../../../../aplicacao/elenco/habilidades.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { corpoErro, naoEncontrado } from '../../../erros.js';

/** `POST /api/grupos/:grupoId/habilidades`: nova habilidade; o nome é único no grupo, sem distinguir caixa. */
export const rotaHabilidadeCriar = new Hono<AppEnv>().post('/api/grupos/:grupoId/habilidades', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const corpo = await lerCorpo(c, habilidadeCorpo);
  if (!corpo.ok) return corpo.resposta;
  const r = await criarHabilidade(c.var.db(), vinculo.grupoId, corpo.dado.nome);
  if (!r.ok) return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', r.campos), 422);
  return c.json(habilidade.parse(r.habilidade), 201);
});
