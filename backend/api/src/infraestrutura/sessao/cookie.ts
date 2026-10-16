import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

/** Único lugar que conhece o cookie de sessão: `__Host-sessao`, sem `Domain`, só `Secure`. */
const NOME = 'sessao';
const TRINTA_DIAS_S = 30 * 24 * 60 * 60;
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function definirCookieSessao(c: Context, token: string): void {
  setCookie(c, NOME, token, {
    prefix: 'host',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: TRINTA_DIAS_S,
  });
}

export function limparCookieSessao(c: Context): void {
  deleteCookie(c, NOME, { prefix: 'host', httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
}

/** Devolve o token só se tiver o formato gerado pela API (256 bits em base64url); senão `null`. */
export function lerTokenSessao(c: Context): string | null {
  const token = getCookie(c, NOME, 'host');
  return token !== undefined && FORMATO_TOKEN.test(token) ? token : null;
}
