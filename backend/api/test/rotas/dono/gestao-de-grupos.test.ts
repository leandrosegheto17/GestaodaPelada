import { grupoDono } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { comEco } from '../../apoio/eco-rotas.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo('2026-10-16'), cookie });

describe('PATCH /api/dono/grupos/:id/situacao (workerd)', () => {
  it.each([
    [{ situacaoComercial: 'uso_proprio', inicioTrial: null }],
    [{ situacaoComercial: 'trial', inicioTrial: '2026-10-01' }],
    [{ situacaoComercial: 'ativo', inicioTrial: null }],
    [{ situacaoComercial: 'inadimplente', inicioTrial: null }],
    [{ situacaoComercial: 'cancelado', inicioTrial: null }],
  ])('aceita %j', async (corpo) => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.dono.cookie).patch(`/api/dono/grupos/${cen.grupoA.id}/situacao`, corpo);
    expect(r.status).toBe(200);
    expect(grupoDono.parse(r.corpo)).toMatchObject(corpo);
  });

  it('trial → ativo zera a data; entradas inválidas dão 422', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/dono/grupos/${cen.grupoA.id}/situacao`;
    await cliente(cen.dono.cookie).patch(url, { situacaoComercial: 'trial', inicioTrial: '2026-10-01' });
    const ativo = await cliente(cen.dono.cookie).patch(url, { situacaoComercial: 'ativo', inicioTrial: null });
    expect(ativo.corpo).toMatchObject({ inicioTrial: null });
    for (const invalido of [
      { situacaoComercial: 'trial', inicioTrial: null },
      { situacaoComercial: 'ativo', inicioTrial: '2026-10-01' },
      { situacaoComercial: 'gratis', inicioTrial: null },
      { situacaoComercial: 'trial', inicioTrial: '2026-02-30' },
      { situacaoComercial: 'ativo', inicioTrial: null, slug: 'x' },
      {},
    ]) {
      expect((await cliente(cen.dono.cookie).patch(url, invalido)).status).toBe(422);
    }
  });

  it('grupo inexistente e id malformado: 404; admin comum: 404', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const corpo = { situacaoComercial: 'ativo', inicioTrial: null };
    expect((await cliente(cen.dono.cookie).patch(`/api/dono/grupos/${randomUUID()}/situacao`, corpo)).status).toBe(404);
    expect((await cliente(cen.dono.cookie).patch('/api/dono/grupos/abc/situacao', corpo)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).patch(`/api/dono/grupos/${cen.grupoA.id}/situacao`, corpo)).status).toBe(
      404,
    );
  });

  it('inadimplente e cancelado não mudam o acesso do admin nem os metadados; resposta sem cache', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/dono/grupos/${cen.grupoA.id}/situacao`;
    const antes = grupoDono.parse((await cliente(cen.dono.cookie).get(`/api/dono/grupos/${cen.grupoA.id}`)).corpo);
    for (const situacaoComercial of ['inadimplente', 'cancelado']) {
      const r = await cliente(cen.dono.cookie).patch(url, { situacaoComercial, inicioTrial: null });
      expect(r.status).toBe(200);
      expect(r.headers.get('cache-control')).toContain('no-store');
      const semSessao = await clienteTeste({ relogio: relogioFixo('2026-10-16') }).patch(url, { situacaoComercial });
      expect(semSessao.status).toBe(401);
      const semCsrf = await clienteTeste({
        relogio: relogioFixo('2026-10-16'),
        cookie: cen.dono.cookie,
        semCsrf: true,
      }).patch(url, { situacaoComercial, inicioTrial: null });
      expect(semCsrf.status).toBe(403);
      expect({ ...grupoDono.parse(r.corpo), situacaoComercial: antes.situacaoComercial }).toEqual(antes);
      expect((await comEco(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(200);
    }
  });
});

describe('arquivar e reativar (workerd)', () => {
  it('arquivar exige o nome exato; arquivado dá 404 ao admin; reativar restaura', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const base = `/api/dono/grupos/${cen.grupoA.id}`;
    const errado = await cliente(cen.dono.cookie).post(`${base}/arquivar`, { nomeConfirmacao: 'grupo a' });
    expect(errado.status).toBe(422);
    expect(errado.corpo).toMatchObject({ erro: { campos: { nomeConfirmacao: expect.any(String) } } });
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(404);

    const ok = await cliente(cen.dono.cookie).post(`${base}/arquivar`, { nomeConfirmacao: 'Grupo A' });
    expect(ok.status).toBe(200);
    expect(ok.corpo).toMatchObject({ arquivadoEm: '2026-10-16' });
    const auditorias = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('acao')
      .where('grupo_id', '=', cen.grupoA.id)
      .execute();
    expect(auditorias.map((a) => a.acao)).toEqual(['grupo_arquivado']);

    const denovo = await cliente(cen.dono.cookie).post(`${base}/arquivar`, { nomeConfirmacao: 'Grupo A' });
    expect(denovo.status).toBe(200);
    expect(
      await kyselyDe(db).selectFrom('auditoria').select('acao').where('grupo_id', '=', cen.grupoA.id).execute(),
    ).toHaveLength(1);

    const reativado = await cliente(cen.dono.cookie).post(`${base}/reativar`);
    expect(reativado.corpo).toMatchObject({ arquivadoEm: null });
    expect((await cliente(cen.dono.cookie).post(`${base}/reativar`)).status).toBe(200);
  });

  it('inexistente e malformado: 404; admin comum: 404', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    expect(
      (await cliente(cen.dono.cookie).post(`/api/dono/grupos/${randomUUID()}/arquivar`, { nomeConfirmacao: 'x' }))
        .status,
    ).toBe(404);
    expect((await cliente(cen.dono.cookie).post('/api/dono/grupos/abc/reativar')).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).post(`/api/dono/grupos/${cen.grupoA.id}/reativar`)).status).toBe(404);
  });
});
