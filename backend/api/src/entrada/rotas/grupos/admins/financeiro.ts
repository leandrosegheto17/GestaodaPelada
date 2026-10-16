import { CODIGOS_ERRO, financeiroAdminCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { AcaoNaPropriaConta, AdminNaoEncontrado } from '../../../../aplicacao/grupos/admins/erros.js';
import { alterarFinanceiroAdmin } from '../../../../aplicacao/grupos/admins/financeiro.js';
import { montarListaAdmins } from '../../../../aplicacao/grupos/admins/lista.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { conflito, naoEncontrado } from '../../../erros.js';
import { exigirFinanceiro } from '../../../middlewares/grupo.js';
import { uuidDaRota } from '../../../parametros.js';

/** `PATCH /api/grupos/:grupoId/admins/:contaId/financeiro`: só quem tem o financeiro concede ou retira. */
export const rotaAdminsFinanceiro = new Hono<AppEnv>().patch(
  '/api/grupos/:grupoId/admins/:contaId/financeiro',
  exigirFinanceiro,
  async (c) => {
    const { vinculo, sessao } = c.var;
    const alvo = uuidDaRota(c, 'contaId');
    if (!vinculo || !sessao || alvo === null) return naoEncontrado(c);
    const corpo = await lerCorpo(c, financeiroAdminCorpo);
    if (!corpo.ok) return corpo.resposta;
    const db = c.var.db();
    try {
      await alterarFinanceiroAdmin(db, vinculo.grupoId, {
        alvoContaId: alvo,
        valor: corpo.dado.acessaFinanceiro,
        autorContaId: sessao.conta.id,
        agora: new Date(c.var.relogio.agoraIso()),
      });
    } catch (erro) {
      if (erro instanceof AdminNaoEncontrado) return naoEncontrado(c);
      if (erro instanceof AcaoNaPropriaConta) {
        return conflito(c, CODIGOS_ERRO.acaoNaPropriaConta, 'Você não pode alterar a sua própria permissão.');
      }
      throw erro;
    }
    return c.json(
      await montarListaAdmins(db, vinculo.grupoId, {
        contaId: sessao.conta.id,
        acessaFinanceiro: vinculo.acessaFinanceiro,
      }),
    );
  },
);
