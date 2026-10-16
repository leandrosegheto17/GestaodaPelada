import { CODIGOS_ERRO } from '@pelada/contrato';
import { Hono } from 'hono';
import { AdminNaoEncontrado, RemoverASiMesmo, UltimoAdmin } from '../../../../aplicacao/grupos/admins/erros.js';
import { removerAdmin } from '../../../../aplicacao/grupos/admins/remover.js';
import type { AppEnv } from '../../../app.js';
import { conflito, naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/** `DELETE /api/grupos/:grupoId/admins/:contaId`: remove o vínculo (204). */
export const rotaAdminsRemover = new Hono<AppEnv>().delete('/api/grupos/:grupoId/admins/:contaId', async (c) => {
  const { vinculo, sessao } = c.var;
  const alvo = uuidDaRota(c, 'contaId');
  if (!vinculo || !sessao || alvo === null) return naoEncontrado(c);
  try {
    await removerAdmin(c.var.db(), vinculo.grupoId, {
      alvoContaId: alvo,
      autorContaId: sessao.conta.id,
      agora: new Date(c.var.relogio.agoraIso()),
    });
    return c.body(null, 204);
  } catch (erro) {
    if (erro instanceof AdminNaoEncontrado) return naoEncontrado(c);
    if (erro instanceof RemoverASiMesmo) {
      return conflito(c, CODIGOS_ERRO.removerASiMesmo, 'Você não pode remover a si mesmo.');
    }
    if (erro instanceof UltimoAdmin) {
      return conflito(c, CODIGOS_ERRO.ultimoAdmin, 'Todo grupo precisa de pelo menos um admin.');
    }
    throw erro;
  }
});
