import { senhaExibida } from '@pelada/contrato';
import { Hono } from 'hono';
import { ContaNaoEncontrada, redefinirSenha } from '../../../aplicacao/acesso/senhas.js';
import * as contas from '../../../infraestrutura/db/repositorios/contas.js';
import type { AppEnv } from '../../app.js';
import { naoEncontrado } from '../../erros.js';
import { uuidDaRota } from '../../parametros.js';

/**
 * `POST /api/dono/contas/:id/redefinir-senha`: nova senha temporária, exibida uma única vez.
 * Só para contas que não são a do dono (essa só se recupera pelo script); essa e a inexistente
 * recebem o mesmo 404.
 */
export const rotaDonoRedefinirSenha = new Hono<AppEnv>().post('/api/dono/contas/:id/redefinir-senha', async (c) => {
  const contaId = uuidDaRota(c, 'id');
  const dono = c.var.sessao;
  if (contaId === null || dono === null) return naoEncontrado(c);
  const db = c.var.db();
  const alvo = await contas.buscarPorId(db, contaId);
  if (!alvo || alvo.eDono) return naoEncontrado(c);
  try {
    const r = await redefinirSenha(
      db,
      contaId,
      { tipo: 'conta', contaId: dono.conta.id },
      new Date(c.var.relogio.agoraIso()),
    );
    return c.json(senhaExibida.parse({ contaId: r.contaId, nome: r.nome, senhaTemporaria: r.senhaTemporaria }));
  } catch (erro) {
    if (erro instanceof ContaNaoEncontrada) return naoEncontrado(c);
    throw erro;
  }
});
