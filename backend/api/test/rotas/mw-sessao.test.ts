import { describe, expect, it } from 'vitest';
import { exigirSessao, exigirSessaoCompleta } from '../../src/entrada/middlewares/sessao.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { relogioFixo } from '../apoio/relogio.js';
import { entrarComo } from '../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const t0 = new Date(relogioFixo('2026-10-16').agoraIso());

/** Cliente com relógio exatamente em `agora` (data e hora). */
function clienteEm(instante: Date, cookie?: string) {
  const dia = new Date(instante.getTime() - 3 * HORA).toISOString();
  const c = clienteTeste({
    relogio: relogioFixo(dia.slice(0, 10), dia.slice(11, 16)),
    ...(cookie ? { cookie } : {}),
  });
  c.app.get('/api/teste/eco-sessao', exigirSessao, (ctx) => ctx.json({ conta: ctx.var.sessao?.conta }));
  c.app.get('/api/teste/eco-completa', exigirSessaoCompleta, (ctx) => ctx.json({ ok: true }));
  return c;
}

describe('middleware de sessão (workerd)', () => {
  it('sem cookie: 401 no formato padrão', async () => {
    const r = await clienteEm(t0).get('/api/teste/eco-sessao');
    expect(r.status).toBe(401);
    expect(r.corpo).toMatchObject({ erro: { codigo: 'nao_autenticado' } });
  });

  it.each([
    ['vazio', '__Host-sessao='],
    ['curto', `__Host-sessao=${'a'.repeat(42)}`],
    ['longo', `__Host-sessao=${'a'.repeat(44)}`],
    ['caracteres inválidos', `__Host-sessao=${'a'.repeat(42)}!`],
    ['sem prefixo', `sessao=${'a'.repeat(43)}`],
  ])('cookie %s: 401', async (_nome, cookie) => {
    const r = await clienteEm(t0, cookie).get('/api/teste/eco-sessao');
    expect(r.status).toBe(401);
  });

  it('formato certo mas desconhecido: 401 e o cookie é limpo', async () => {
    const r = await clienteEm(t0, `__Host-sessao=${'a'.repeat(43)}`).get('/api/teste/eco-sessao');
    expect(r.status).toBe(401);
    expect(r.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
  });

  it('sessão válida entrega a conta sem hash de senha', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    const r = await clienteEm(t0, cookie).get('/api/teste/eco-sessao');
    expect(r.status).toBe(200);
    expect(r.texto).not.toMatch(/senha_hash|senhaHash/);
    expect((r.corpo as { conta: { id: string } }).conta.id).toBe(conta.id);
  });

  it('vale no 29º dia', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    expect((await clienteEm(new Date(t0.getTime() + 29 * DIA), cookie).get('/api/teste/eco-sessao')).status).toBe(200);
  });

  it('desliza só depois de 24 h sem uso', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    const cedo = await clienteEm(new Date(t0.getTime() + HORA), cookie).get('/api/teste/eco-sessao');
    expect(cedo.headers.get('Set-Cookie')).toBeNull();
    const tarde = await clienteEm(new Date(t0.getTime() + 25 * HORA), cookie).get('/api/teste/eco-sessao');
    expect(tarde.headers.get('Set-Cookie')).toMatch(/__Host-sessao=/);
  });

  it('expirada: 401', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    const r = await clienteEm(new Date(t0.getTime() + 30 * DIA + 60_000), cookie).get('/api/teste/eco-sessao');
    expect(r.status).toBe(401);
  });

  it('escopo troca_de_senha passa em exigirSessao e é recusado em exigirSessaoCompleta (403)', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    const { cookie } = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });
    expect((await clienteEm(t0, cookie).get('/api/teste/eco-sessao')).status).toBe(200);
    const completa = await clienteEm(t0, cookie).get('/api/teste/eco-completa');
    expect(completa.status).toBe(403);
    expect(completa.corpo).toMatchObject({ erro: { codigo: 'troca_de_senha_obrigatoria' } });
  });
});
