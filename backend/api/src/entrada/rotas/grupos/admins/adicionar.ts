import { CODIGOS_ERRO, adicionarAdminCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { AdminJaVinculado, vincularOuCriarAdminEmTransacao } from '../../../../aplicacao/acesso/admin-por-email.js';
import type { AppEnv } from '../../../app.js';
import { lerCorpo } from '../../../corpo.js';
import { conflito, naoEncontrado } from '../../../erros.js';

/**
 * `POST /api/grupos/:grupoId/admins`: cria a conta (senha temporária exibida uma vez) ou só
 * vincula uma conta existente. O financeiro nasce desligado: o valor não vem do corpo.
 */
export const rotaAdminsAdicionar = new Hono<AppEnv>().post('/api/grupos/:grupoId/admins', async (c) => {
  const { vinculo, sessao } = c.var;
  if (!vinculo || !sessao) return naoEncontrado(c);
  const corpo = await lerCorpo(c, adicionarAdminCorpo);
  if (!corpo.ok) return corpo.resposta;
  try {
    const adicionado = await vincularOuCriarAdminEmTransacao(
      c.var.db(),
      vinculo.grupoId,
      { nome: corpo.dado.nome, email: corpo.dado.email, acessaFinanceiro: false },
      { tipo: 'conta', contaId: sessao.conta.id },
      new Date(c.var.relogio.agoraIso()),
    );
    return c.json(adicionado, 201);
  } catch (erro) {
    if (erro instanceof AdminJaVinculado) {
      return conflito(c, CODIGOS_ERRO.adminJaVinculado, 'Esse e-mail já é admin deste grupo.');
    }
    throw erro;
  }
});
