import { erroPadrao, LIMITES, data } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import { criarApp } from '../src/entrada/app.js';
import { responderValidacao } from '../src/entrada/erros.js';
import { relogioFixo } from '../src/infraestrutura/relogio/index.js';

const env = { URL_PUBLICA: 'https://pelada.exemplo.dev', DONO_EMAIL: 'dono@exemplo.com' };

function app() {
  const a = criarApp({ relogio: relogioFixo('2026-10-22T12:00:00Z') });
  a.post('/api/teste/escrita', (c) => c.json({ ok: true }));
  a.get('/api/teste/erro', () => {
    throw new Error('segredo-interno');
  });
  a.get('/api/teste/validacao', (c) => {
    const r = data.safeParse('lixo-secreto');
    return r.success ? c.json({}) : responderValidacao(c, r.error);
  });
  return a;
}

const chamar = (caminho: string, init?: RequestInit) => app().request(caminho, init, env);

describe('app', () => {
  it('GET /api/saude responde 200 sem cache', async () => {
    const r = await chamar('/api/saude');
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rota inexistente responde 404 no formato padrão', async () => {
    const r = await chamar('/api/inexistente');
    expect(r.status).toBe(404);
    expect(erroPadrao.safeParse(await r.json()).success).toBe(true);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });

  it.each([
    [{}, 403],
    [{ 'X-Pelada': '0' }, 403],
    [{ 'X-Pelada': '1 ' }, 403],
    [{ 'X-Pelada': '1' }, 200],
    [{ 'x-pelada': '1' }, 200],
  ])('POST com cabeçalhos %j → %i', async (cabecalhos, esperado) => {
    const r = await chamar('/api/teste/escrita', { method: 'POST', headers: cabecalhos });
    expect(r.status).toBe(esperado);
    if (esperado === 403) expect(erroPadrao.safeParse(await r.json()).success).toBe(true);
  });

  it('GET não exige o cabeçalho', async () => {
    expect((await chamar('/api/saude')).status).toBe(200);
  });

  it('erro lançado vira 500 sem detalhe', async () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await chamar('/api/teste/erro');
    const texto = await r.text();
    expect(r.status).toBe(500);
    expect(texto).not.toContain('segredo-interno');
    expect(JSON.stringify(espiao.mock.calls)).not.toContain('segredo-interno');
    espiao.mockRestore();
  });

  it('configuração inválida vira 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await app().request('/api/saude', undefined, { ...env, URL_PUBLICA: 'lixo' });
    expect(r.status).toBe(500);
  });

  it('422 traz campos sem ecoar o valor', async () => {
    const r = await chamar('/api/teste/validacao');
    const corpo = (await r.json()) as { erro: { campos: Record<string, string> } };
    expect(r.status).toBe(422);
    expect(corpo.erro.campos['corpo']).toBeDefined();
    expect(JSON.stringify(corpo)).not.toContain('lixo-secreto');
  });

  it('corpo acima de 16 KB responde 413', async () => {
    const grande = 'x'.repeat(LIMITES.corpoBytes + 1);
    const r = await chamar('/api/teste/escrita', {
      method: 'POST',
      headers: { 'X-Pelada': '1', 'Content-Length': String(grande.length) },
      body: grande,
    });
    expect(r.status).toBe(413);
  });
});
