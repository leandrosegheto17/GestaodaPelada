import { Hono } from 'hono';
import { excluirHabilidade } from '../../../../aplicacao/elenco/habilidades.js';
import type { AppEnv } from '../../../app.js';
import { naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `DELETE /api/grupos/:grupoId/habilidades/:id`: apaga a habilidade e as notas dela (204), com auditoria. */
export const rotaHabilidadeExcluir = new Hono<AppEnv>().delete('/api/grupos/:grupoId/habilidades/:id', async (c) => {
  const { vinculo, sessao } = c.var;
  const id = uuidDaRota(c, 'id');
  if (!vinculo || !sessao || id === null) return naoEncontrado(c);
  const r = await excluirHabilidade(c.var.db(), vinculo.grupoId, id, {
    autorContaId: sessao.conta.id,
    agora: new Date(c.var.relogio.agoraIso()),
  });
  return r === null ? naoEncontrado(c) : c.body(null, 204);
});
