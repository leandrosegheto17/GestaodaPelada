import { esqueciSenhaCorpo, MENSAGEM_ESQUECI_SENHA } from '@pelada/contrato';
import { Hono } from 'hono';
import * as contas from '../../infraestrutura/db/repositorios/contas.js';
import * as pedidos from '../../infraestrutura/db/repositorios/pedidos-reset.js';
import type { AppEnv } from '../app.js';
import { lerCorpo } from '../corpo.js';

/**
 * `POST /api/sessao/esqueci-senha`: a resposta é a mesma para qualquer e-mail. Se for de um admin
 * (conta existente que não é o dono), registra ou atualiza o pedido pendente, visível só ao dono.
 * Nenhum e-mail é enviado e o e-mail informado não vai para log.
 */
export const rotaSessaoEsqueciSenha = new Hono<AppEnv>().post('/api/sessao/esqueci-senha', async (c) => {
  const corpo = await lerCorpo(c, esqueciSenhaCorpo);
  if (!corpo.ok) return corpo.resposta;

  const db = c.var.db();
  const conta = await contas.buscarPorEmail(db, corpo.dado.email);
  if (conta && !conta.eDono) {
    await pedidos.registrarOuAtualizar(db, conta.id, new Date(c.var.relogio.agoraIso()));
  }
  return c.json({ mensagem: MENSAGEM_ESQUECI_SENHA });
});
