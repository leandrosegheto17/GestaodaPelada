import { CODIGOS_ERRO, senhaExibida } from '@pelada/contrato';
import { Hono } from 'hono';
import { ContaNaoEncontrada, redefinirSenha } from '../../../../aplicacao/acesso/senhas.js';
import * as contas from '../../../../infraestrutura/db/repositorios/contas.js';
import * as vinculos from '../../../../infraestrutura/db/repositorios/vinculos.js';
import type { AppEnv } from '../../../app.js';
import { conflito, naoEncontrado } from '../../../erros.js';
import { uuidDaRota } from '../../../parametros.js';

/**
 * `POST /api/grupos/:grupoId/admins/:contaId/redefinir-senha`: só para outro admin do mesmo grupo.
 * Alvo de outro grupo, inexistente ou o dono recebem o mesmo 404.
 */
export const rotaAdminsRedefinirSenha = new Hono<AppEnv>().post(
  '/api/grupos/:grupoId/admins/:contaId/redefinir-senha',
  async (c) => {
    const { vinculo, sessao } = c.var;
    const alvo = uuidDaRota(c, 'contaId');
    if (!vinculo || !sessao || alvo === null) return naoEncontrado(c);
    if (alvo === sessao.conta.id) {
      return conflito(c, CODIGOS_ERRO.acaoNaPropriaConta, 'Use "Minha senha" para trocar a sua.');
    }
    const db = c.var.db();
    if (!(await vinculos.buscar(db, vinculo.grupoId, alvo))) return naoEncontrado(c);
    const conta = await contas.buscarPorId(db, alvo);
    if (!conta || conta.eDono) return naoEncontrado(c);
    try {
      const r = await redefinirSenha(
        db,
        alvo,
        { tipo: 'conta', contaId: sessao.conta.id },
        new Date(c.var.relogio.agoraIso()),
      );
      return c.json(senhaExibida.parse({ contaId: r.contaId, nome: r.nome, senhaTemporaria: r.senhaTemporaria }));
    } catch (erro) {
      if (erro instanceof ContaNaoEncontrada) return naoEncontrado(c);
      throw erro;
    }
  },
);
