import { describe, expect, it } from 'vitest';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { entrarComo } from '../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const t0 = new Date(relogioFixo('2026-10-16').agoraIso());
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), semCsrf, ...(cookie ? { cookie } : {}) });

describe('POST /api/sessao/sair (workerd)', () => {
  it('encerra só a sessão deste aparelho e limpa o cookie', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const a = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    const b = await entrarComo(db, fabrica, conta.id, { agora: t0 });

    const r = await cliente(a.cookie).post('/api/sessao/sair');
    expect(r.status).toBe(204);
    const cabecalho = r.headers.get('Set-Cookie') ?? '';
    expect(cabecalho).toMatch(/Max-Age=0/);
    expect(cabecalho).toMatch(/Path=\//);
    expect(cabecalho).toMatch(/Secure/);
    expect(cabecalho).toMatch(/HttpOnly/);
    expect(cabecalho).toMatch(/SameSite=Lax/);
    expect(cabecalho).not.toMatch(/Domain/i);

    expect((await cliente(a.cookie).get('/api/sessao/eu')).status).toBe(401);
    expect((await cliente(b.cookie).get('/api/sessao/eu')).status).toBe(200);
  });

  it('é idempotente: duas vezes, sem cookie ou com cookie malformado dão 204', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const a = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    expect((await cliente(a.cookie).post('/api/sessao/sair')).status).toBe(204);
    expect((await cliente(a.cookie).post('/api/sessao/sair')).status).toBe(204);
    expect((await cliente().post('/api/sessao/sair')).status).toBe(204);
    const malformado = await cliente('__Host-sessao=lixo').post('/api/sessao/sair');
    expect(malformado.status).toBe(204);
    expect(malformado.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
  });

  it('escopo troca_de_senha também pode sair', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    const a = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });
    expect((await cliente(a.cookie).post('/api/sessao/sair')).status).toBe(204);
    expect((await cliente(a.cookie).get('/api/sessao/eu')).status).toBe(401);
  });

  it('sem X-Pelada: 403 e a sessão continua válida', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const a = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    expect((await cliente(a.cookie, true).post('/api/sessao/sair')).status).toBe(403);
    expect((await cliente(a.cookie).get('/api/sessao/eu')).status).toBe(200);
  });
});
