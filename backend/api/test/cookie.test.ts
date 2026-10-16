import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { definirCookieSessao, lerTokenSessao, limparCookieSessao } from '../src/infraestrutura/sessao/cookie.js';

const TOKEN = 'a'.repeat(43);

function app() {
  const a = new Hono();
  a.get('/definir', (c) => {
    definirCookieSessao(c, TOKEN);
    return c.text('ok');
  });
  a.get('/limpar', (c) => {
    limparCookieSessao(c);
    return c.text('ok');
  });
  a.get('/ler', (c) => c.json({ token: lerTokenSessao(c) }));
  return a;
}

describe('cookie de sessão', () => {
  it('definir: __Host-sessao, HttpOnly, Secure, SameSite=Lax, Path=/, 30 dias, sem Domain', async () => {
    const cabecalho = (await app().request('/definir')).headers.get('Set-Cookie') ?? '';
    expect(cabecalho).toContain(`__Host-sessao=${TOKEN}`);
    expect(cabecalho).toMatch(/HttpOnly/);
    expect(cabecalho).toMatch(/Secure/);
    expect(cabecalho).toMatch(/SameSite=Lax/);
    expect(cabecalho).toMatch(/Path=\//);
    expect(cabecalho).toMatch(/Max-Age=2592000/);
    expect(cabecalho).not.toMatch(/Domain/i);
  });

  it('limpar: Max-Age=0 com os mesmos atributos', async () => {
    const cabecalho = (await app().request('/limpar')).headers.get('Set-Cookie') ?? '';
    expect(cabecalho).toMatch(/Max-Age=0/);
    expect(cabecalho).toMatch(/Secure/);
    expect(cabecalho).toMatch(/Path=\//);
    expect(cabecalho).not.toMatch(/Domain/i);
  });

  it('ler: só aceita o formato gerado pela API', async () => {
    const ler = async (cookie: string) =>
      ((await app().request('/ler', { headers: { Cookie: cookie } })).json() as Promise<{ token: string | null }>).then(
        (r) => r.token,
      );
    expect(await ler(`__Host-sessao=${TOKEN}`)).toBe(TOKEN);
    expect(await ler(`__Host-sessao=${'a'.repeat(42)}`)).toBeNull();
    expect(await ler(`__Host-sessao=${'a'.repeat(44)}`)).toBeNull();
    expect(await ler(`sessao=${TOKEN}`)).toBeNull();
    expect(await ler(`__Host-sessao=${'a'.repeat(42)}$`)).toBeNull();
  });
});
