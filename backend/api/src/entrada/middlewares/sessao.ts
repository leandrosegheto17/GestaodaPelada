import { CODIGOS_ERRO } from '@pelada/contrato';
import type { Context, MiddlewareHandler } from 'hono';
import { resolverSessao } from '../../aplicacao/acesso/sessao.js';
import { definirCookieSessao, lerTokenSessao, limparCookieSessao } from '../../infraestrutura/sessao/cookie.js';
import type { AppEnv } from '../app.js';
import { corpoErro } from '../erros.js';

/** Lê o cookie, valida a sessão e põe `c.var.sessao` (ou `null`). Não recusa ninguém. */
export const carregarSessao: MiddlewareHandler<AppEnv> = async (c, proximo) => {
  const token = lerTokenSessao(c);
  if (token === null) {
    c.set('sessao', null);
    return proximo();
  }
  const agora = new Date(c.var.relogio.agoraIso());
  const sessao = await resolverSessao(c.var.db(), token, agora);
  if (sessao === null) {
    limparCookieSessao(c);
    c.set('sessao', null);
  } else {
    c.set('sessao', sessao);
    if (sessao.renovada) definirCookieSessao(c, token);
  }
  return proximo();
};

/** Sem sessão: 401. O escopo `troca_de_senha` passa (alcança `eu`, `trocar-senha` e `sair`). */
export const exigirSessao: MiddlewareHandler<AppEnv> = async (c, proximo) => {
  if (c.var.sessao === null) {
    return c.json(corpoErro(CODIGOS_ERRO.naoAutenticado, 'Entre para continuar.'), 401);
  }
  return proximo();
};

/** Resposta de recusa se não há sessão completa (401 sem sessão, 403 se falta trocar a senha); senão `null`. */
export function recusarSemSessaoCompleta(c: Context<AppEnv>): Response | null {
  if (c.var.sessao === null) {
    return c.json(corpoErro(CODIGOS_ERRO.naoAutenticado, 'Entre para continuar.'), 401);
  }
  if (c.var.sessao.escopo !== 'completo') {
    return c.json(corpoErro(CODIGOS_ERRO.trocaDeSenhaObrigatoria, 'Troque a senha temporária para continuar.'), 403);
  }
  return null;
}

/** Sessão de escopo completo; quem ainda precisa trocar a senha recebe 403. */
export const exigirSessaoCompleta: MiddlewareHandler<AppEnv> = async (c, proximo) => {
  return recusarSemSessaoCompleta(c) ?? proximo();
};
