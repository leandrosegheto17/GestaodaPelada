import { describe, expect, it } from 'vitest';
import * as contas from '../../src/infraestrutura/db/repositorios/contas.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { entrarComo } from '../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const t0 = new Date(relogioFixo('2026-10-16').agoraIso());
const cliente = (cookie?: string, opcoes: { semCsrf?: boolean; dia?: string } = {}) =>
  clienteTeste({
    relogio: relogioFixo(opcoes.dia ?? '2026-10-16'),
    semCsrf: opcoes.semCsrf ?? false,
    ...(cookie ? { cookie } : {}),
  });
const ROTA = '/api/sessao/aviso-privacidade';

describe('POST /api/sessao/aviso-privacidade (workerd)', () => {
  it('grava o instante, responde 204 sem corpo e o eu passa a dizer que viu', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    expect(
      ((await cliente(cookie).get('/api/sessao/eu')).corpo as { avisoPrivacidadeVisto: boolean }).avisoPrivacidadeVisto,
    ).toBe(false);

    const r = await cliente(cookie).post(ROTA, {});
    expect(r.status).toBe(204);
    expect(r.texto).toBe('');
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(
      ((await cliente(cookie).get('/api/sessao/eu')).corpo as { avisoPrivacidadeVisto: boolean }).avisoPrivacidadeVisto,
    ).toBe(true);
  });

  it('aceita o corpo ausente', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    expect((await cliente(cookie).post(ROTA)).status).toBe(204);
  });

  it('é idempotente: a segunda chamada, mais tarde, mantém o primeiro instante', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    expect((await cliente(cookie).post(ROTA, {})).status).toBe(204);
    const primeiro = (await contas.buscarPorId(db, conta.id))?.avisoPrivacidadeVistoEm;
    expect(primeiro).toEqual(t0);

    expect((await cliente(cookie, { dia: '2026-10-20' }).post(ROTA, {})).status).toBe(204);
    expect((await contas.buscarPorId(db, conta.id))?.avisoPrivacidadeVistoEm).toEqual(primeiro);
  });

  it('corpo com campo extra ou JSON malformado: 422 no formato padrão', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    const extra = await cliente(cookie).post(ROTA, { contaId: 'outra' });
    expect(extra.status).toBe(422);
    expect(extra.corpo).toMatchObject({ erro: { codigo: 'validacao' } });
    const malformado = await cliente(cookie).post(ROTA, 'isto não é json{');
    expect(malformado.status).toBe(422);
    expect((await contas.buscarPorId(db, conta.id))?.avisoPrivacidadeVistoEm).toBeNull();
  });

  it('sem cookie: 401; escopo troca_de_senha: recusado e nada gravado; sem X-Pelada: 403', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica, { temporaria: true });
    expect((await cliente().post(ROTA, {})).status).toBe(401);

    const parcial = await entrarComo(db, fabrica, conta.id, { escopo: 'troca_de_senha', agora: t0 });
    const recusada = await cliente(parcial.cookie).post(ROTA, {});
    expect(recusada.status).toBe(403);
    expect(recusada.corpo).toMatchObject({ erro: { codigo: 'troca_de_senha_obrigatoria' } });

    const completa = await entrarComo(db, fabrica, conta.id, { agora: t0 });
    expect((await cliente(completa.cookie, { semCsrf: true }).post(ROTA, {})).status).toBe(403);
    expect((await contas.buscarPorId(db, conta.id))?.avisoPrivacidadeVistoEm).toBeNull();
  });

  it('outra conta não é afetada', async () => {
    const db = await abrir();
    const a = await criarConta(db, fabrica);
    const b = await criarConta(db, fabrica);
    const { cookie } = await entrarComo(db, fabrica, a.id, { agora: t0 });
    expect((await cliente(cookie).post(ROTA, {})).status).toBe(204);
    expect((await contas.buscarPorId(db, a.id))?.avisoPrivacidadeVistoEm).not.toBeNull();
    expect((await contas.buscarPorId(db, b.id))?.avisoPrivacidadeVistoEm).toBeNull();
  });
});
