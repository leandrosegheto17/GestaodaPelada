import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { vincularAdmin } from '../../../apoio/fabricas/grupos.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), semCsrf, cookie });

describe('DELETE /api/grupos/:g/admins/:contaId (workerd)', () => {
  it('204 sem corpo; o removido leva 404 no grupo, mas segue entrando no outro onde é admin', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const removido = cen.adminASemFinanceiro;
    await vincularAdmin(db, cen.grupoB.id, removido.id);
    const url = `/api/grupos/${cen.grupoA.id}/admins/${removido.id}`;
    expect((await cliente(removido.cookie).get(`/api/grupos/${cen.grupoA.id}/admins`)).status).toBe(200);

    const r = await cliente(cen.adminA.cookie).delete(url);
    expect(r.status).toBe(204);
    expect(r.texto).toBe('');
    const auditorias = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'entidade_id'])
      .where('grupo_id', '=', cen.grupoA.id)
      .execute();
    expect(auditorias).toEqual([{ acao: 'admin_removido', entidade_id: removido.id }]);

    expect((await cliente(removido.cookie).get(`/api/grupos/${cen.grupoA.id}/admins`)).status).toBe(404);
    expect((await cliente(removido.cookie).get(`/api/grupos/${cen.grupoB.id}/admins`)).status).toBe(200);
  });

  it('a si mesmo e último admin dão 409 com código próprio e nada muda', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = (id: string) => `/api/grupos/${cen.grupoA.id}/admins/${id}`;
    const proprio = await cliente(cen.adminA.cookie).delete(url(cen.adminA.id));
    expect(proprio.status).toBe(409);
    expect(proprio.corpo).toMatchObject({ erro: { codigo: 'remover_a_si_mesmo' } });
    expect((await cliente(cen.adminA.cookie).delete(url(cen.adminASemFinanceiro.id))).status).toBe(204);
    const ultimo = await cliente(cen.adminA.cookie).delete(url(cen.adminA.id));
    expect(ultimo.status).toBe(409);
    expect(await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/admins`)).toMatchObject({ status: 200 });
  });

  it('alvo de outro grupo e uuid malformado dão 404; sem X-Pelada dá 403', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const base = `/api/grupos/${cen.grupoA.id}/admins`;
    expect((await cliente(cen.adminA.cookie).delete(`${base}/${cen.adminB.id}`)).status).toBe(404);
    expect((await cliente(cen.adminB.cookie).get(`/api/grupos/${cen.grupoB.id}/admins`)).status).toBe(200);
    expect((await cliente(cen.adminA.cookie).delete(`${base}/${randomUUID()}`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(`${base}/abc`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie, true).delete(`${base}/${cen.adminASemFinanceiro.id}`)).status).toBe(403);
  });
});
