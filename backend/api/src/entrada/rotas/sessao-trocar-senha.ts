import { CODIGOS_ERRO, trocarSenhaCorpo } from '@pelada/contrato';
import { Hono } from 'hono';
import { trocarSenha } from '../../aplicacao/acesso/trocar-senha.js';
import type { AppEnv } from '../app.js';
import { lerCorpo } from '../corpo.js';
import { corpoErro } from '../erros.js';
import { exigirSessao } from '../middlewares/sessao.js';

/** `POST /api/sessao/trocar-senha`: alcança também o escopo `troca_de_senha`; 204 em caso de sucesso. */
export const rotaSessaoTrocarSenha = new Hono<AppEnv>().post('/api/sessao/trocar-senha', exigirSessao, async (c) => {
  const sessao = c.var.sessao;
  if (sessao === null) return c.body(null, 401);
  const corpo = await lerCorpo(c, trocarSenhaCorpo);
  if (!corpo.ok) return corpo.resposta;

  const resultado = await trocarSenha(
    c.var.db(),
    { contaId: sessao.conta.id, sessaoId: sessao.sessaoId, escopo: sessao.escopo },
    { senhaAtual: corpo.dado.senhaAtual, novaSenha: corpo.dado.novaSenha },
    new Date(c.var.relogio.agoraIso()),
  );
  if (resultado.tipo === 'bloqueada') {
    return c.json(
      {
        erro: {
          codigo: 'bloqueado_temporariamente',
          mensagem: 'Muitas tentativas. Tente de novo em 15 minutos.',
          liberaEm: resultado.liberaEm.toISOString(),
        },
      },
      429,
    );
  }
  if (resultado.tipo === 'recusada') {
    return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', resultado.campos), 422);
  }
  return c.body(null, 204);
});
