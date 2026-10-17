import { randomUUID } from 'node:crypto';
import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import { carregarVinculo } from '../../src/aplicacao/acesso/vinculo.js';
import { criarExigirVinculo } from '../../src/entrada/middlewares/grupo.js';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { criarApp } from '../../src/entrada/app.js';
import { montarCenario } from '../apoio/cenario-acesso.js';
import { comEco } from '../apoio/eco-rotas.js';
import { usarDbDoWorker } from '../apoio/db-worker.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { entrarComo } from '../apoio/sessao.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);

describe('middlewares de grupo e financeiro (workerd)', () => {
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

  it.each(['eco', 'financeiro/eco'])(
    'sessão de escopo troca_de_senha em /api/grupos/:id/%s: 403 troca_de_senha_obrigatoria, não 404',
    async (sufixo) => {
      const db = await abrir();
      const cen = await montarCenario(db, fabrica);
      const parcial = await entrarComo(db, fabrica, cen.adminA.id, { escopo: 'troca_de_senha' });
      const r = await comEco(parcial.cookie).get(`/api/grupos/${cen.grupoA.id}/${sufixo}`);
      expect(r.status).toBe(403);
      expect(r.corpo).toMatchObject({ erro: { codigo: 'troca_de_senha_obrigatoria' } });
    },
  );

  it.each(['/api/grupos//eco', '/api/grupos/%20/eco'])('%s responde 404 sem consultar o vínculo', async (caminho) => {
    const espiao = vi.fn(carregarVinculo);
    const app = criarApp();
    app.use('/api/grupos/:grupoId/*', criarExigirVinculo({ carregarVinculo: espiao }));
    app.get('/api/grupos/:grupoId/eco', (c) => c.json({ ok: true }));
    const cen = await montarCenario(await abrir(), fabrica);
    const ctx = createExecutionContext();
    const resposta = await app.fetch(
      new Request(`http://app.invalid${caminho}`, { headers: { Cookie: cen.adminA.cookie } }),
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(resposta.status).toBe(404);
    expect(espiao).not.toHaveBeenCalled();
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
