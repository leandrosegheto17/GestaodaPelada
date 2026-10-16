import { editarGrupoCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { editarGrupo } from '../../../aplicacao/grupos/editar.js';
import { carregarGrupoDetalhe } from '../../../aplicacao/grupos/detalhe.js';
import type { AppEnv } from '../../app.js';
import { lerCorpo } from '../../corpo.js';
import { naoEncontrado } from '../../erros.js';

/** `PATCH /api/grupos/:grupoId`: edita os dados do grupo e devolve o grupo atualizado. */
export const rotaGrupoEditar = new Hono<AppEnv>().patch('/api/grupos/:grupoId', async (c) => {
  const vinculo = c.var.vinculo;
  if (!vinculo) return naoEncontrado(c);
  const corpo = await lerCorpo(c, editarGrupoCorpo);
  if (!corpo.ok) return corpo.resposta;

  const db = c.var.db();
  if (!(await editarGrupo(db, vinculo.grupoId, corpo.dado))) return naoEncontrado(c);
  const detalhe = await carregarGrupoDetalhe(db, {
    grupoId: vinculo.grupoId,
    acessaFinanceiro: vinculo.acessaFinanceiro,
    hoje: c.var.relogio.hoje(),
    urlPublica: c.var.config.urlPublica,
  });
  return detalhe ? c.json(detalhe) : naoEncontrado(c);
});
