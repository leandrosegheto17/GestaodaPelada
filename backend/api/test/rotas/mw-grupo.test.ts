import { randomUUID } from 'node:crypto';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { carregarVinculo } from '../../src/aplicacao/acesso/vinculo.js';
import { exigirDono } from '../../src/entrada/middlewares/dono.js';
import { criarExigirVinculo } from '../../src/entrada/middlewares/grupo.js';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { criarApp } from '../../src/entrada/app.js';
import { montarCenario } from '../apoio/cenario-acesso.js';
import { clienteTeste } from '../apoio/cliente.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

function comEco(cookie?: string) {
  const c = clienteTeste({ relogio: relogioFixo('2026-10-16'), ...(cookie ? { cookie } : {}) });
  c.app.get('/api/grupos/:grupoId/eco', (ctx) => ctx.json({ ok: true }));
  c.app.post('/api/grupos/:grupoId/eco', (ctx) => ctx.json({ ok: true }));
  c.app.get('/api/grupos/:grupoId/financeiro/eco', (ctx) => ctx.json({ ok: true }));
  c.app.get('/api/dono/eco', (ctx) => ctx.json({ ok: true }));
  return c;
}

describe('middlewares de grupo e de dono (workerd)', () => {
  it('admin de A vê A; admin de B recebe o mesmo 404 de um grupo inexistente', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect((await comEco(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(200);
    const alheio = await comEco(cen.adminB.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`);
    const inexistente = await comEco(cen.adminB.cookie).get(`/api/grupos/${randomUUID()}/eco`);
    expect(alheio.status).toBe(404);
    expect(alheio.texto).toBe(inexistente.texto);
    expect(alheio.headers.get('Cache-Control')).toBe(inexistente.headers.get('Cache-Control'));
  });

  it('sem sessão: 401; escrita em grupo alheio: 404', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect((await comEco().get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(401);
    expect((await comEco(cen.adminB.cookie).post(`/api/grupos/${cen.grupoA.id}/eco`, {})).status).toBe(404);
  });

  it('grupo arquivado: 404 mesmo com vínculo', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await kyselyDe(db)
      .updateTable('grupos')
      .set({ arquivado_em: new Date('2026-10-16T12:00:00Z') })
      .where('id', '=', cen.grupoA.id)
      .execute();
    expect((await comEco(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(404);
  });

  it('financeiro: com permissão 200, vínculo sem permissão 403, sem vínculo 404', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const rota = `/api/grupos/${cen.grupoA.id}/financeiro/eco`;
    expect((await comEco(cen.adminA.cookie).get(rota)).status).toBe(200);
    const sem = await comEco(cen.adminASemFinanceiro.cookie).get(rota);
    expect(sem.status).toBe(403);
    expect(sem.corpo).toMatchObject({ erro: { codigo: 'sem_permissao_financeiro' } });
    expect((await comEco(cen.adminB.cookie).get(rota)).status).toBe(404);
  });

  it('dono: eDono passa, admin comum recebe 404 e o dono sem vínculo não vê o grupo', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect((await comEco(cen.dono.cookie).get('/api/dono/eco')).status).toBe(200);
    expect((await comEco(cen.adminA.cookie).get('/api/dono/eco')).status).toBe(404);
    expect((await comEco(cen.dono.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(404);
    expect(typeof exigirDono).toBe('function');
  });

  it('vínculo removido entre duas requisições: a segunda dá 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const cliente = comEco(cen.adminASemFinanceiro.cookie);
    expect((await cliente.get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(200);
    await kyselyDe(db).deleteFrom('vinculos_admin').where('conta_id', '=', cen.adminASemFinanceiro.id).execute();
    expect((await cliente.get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(404);
  });

  it.each(['abc', 'a'.repeat(35), 'a'.repeat(37), '%2e%2e', "'%20OR%201=1", 'x'.repeat(10_000)])(
    'id malformado %# responde 404 sem consultar o banco',
    async (id) => {
      const espiao = vi.fn(carregarVinculo);
      const app = criarApp();
      app.use('/api/teste/:grupoId/*', criarExigirVinculo({ carregarVinculo: espiao }));
      app.get('/api/teste/:grupoId/eco', (c) => c.json({ ok: true }));
      const cen = await montarCenario(await abrir(), fabrica);
      const ctx = createExecutionContext();
      const resposta = await app.fetch(
        new Request(`http://app.invalid/api/teste/${id}/eco`, { headers: { Cookie: cen.adminA.cookie } }),
        env,
        ctx,
      );
      await waitOnExecutionContext(ctx);
      expect(resposta.status).toBe(404);
      expect(espiao).not.toHaveBeenCalled();
    },
  );
});
