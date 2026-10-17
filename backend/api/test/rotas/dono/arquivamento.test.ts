import { grupoDono } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as vinculos from '../../../src/infraestrutura/db/repositorios/vinculos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { comEco } from '../../apoio/eco-rotas.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), semCsrf, ...(cookie ? { cookie } : {}) });

describe('arquivar e reativar (workerd)', () => {
  it('nome exato: 200 no formato GrupoDono, auditoria do dono, admin recebe 404 e reativar restaura', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const base = `/api/dono/grupos/${cen.grupoA.id}`;
    const ok = await cliente(cen.dono.cookie).post(`${base}/arquivar`, { nomeConfirmacao: 'Grupo A' });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Cache-Control')).toBe('no-store');
    expect(grupoDono.parse(ok.corpo)).toMatchObject({ id: cen.grupoA.id, arquivadoEm: '2026-10-16' });
    const auditorias = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'autor_conta_id'])
      .where('grupo_id', '=', cen.grupoA.id)
      .execute();
    expect(auditorias).toEqual([{ acao: 'grupo_arquivado', autor_conta_id: cen.dono.id }]);

    expect((await comEco(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(404);
    expect((await vinculos.gruposDaConta(db, cen.adminA.id)).map((g) => g.grupoId)).not.toContain(cen.grupoA.id);

    const re = await cliente(cen.dono.cookie).post(`${base}/reativar`);
    expect(re.status).toBe(200);
    expect(grupoDono.parse(re.corpo).arquivadoEm).toBeNull();
    expect((await comEco(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/eco`)).status).toBe(200);
    expect((await vinculos.gruposDaConta(db, cen.adminA.id)).map((g) => g.grupoId)).toContain(cen.grupoA.id);
  });

  it.each([[{ nomeConfirmacao: 'grupo a' }], [{ nomeConfirmacao: 'Grupo A ' }], [{ nomeConfirmacao: '' }], [{}]])(
    'corpo %j: 422 em campos.nomeConfirmacao, grupo intacto, sem auditoria',
    async (corpo) => {
      const db = await abrir();
      const cen = await montarCenario(db, fabrica);
      const r = await cliente(cen.dono.cookie).post(`/api/dono/grupos/${cen.grupoA.id}/arquivar`, corpo);
      expect(r.status).toBe(422);
      expect(r.corpo).toMatchObject({ erro: { campos: { nomeConfirmacao: expect.any(String) } } });
      const g = await kyselyDe(db)
        .selectFrom('grupos')
        .select('arquivado_em')
        .where('id', '=', cen.grupoA.id)
        .executeTakeFirstOrThrow();
      expect(g.arquivado_em).toBeNull();
      const aud = await kyselyDe(db)
        .selectFrom('auditoria')
        .select('id')
        .where('grupo_id', '=', cen.grupoA.id)
        .execute();
      expect(aud).toEqual([]);
    },
  );

  it('arquivar duas vezes: 1 auditoria; reativar grupo ativo: 200 sem auditoria', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const base = `/api/dono/grupos/${cen.grupoA.id}`;
    const auditorias = () =>
      kyselyDe(db).selectFrom('auditoria').select('id').where('grupo_id', '=', cen.grupoA.id).execute();
    expect((await cliente(cen.dono.cookie).post(`${base}/reativar`)).status).toBe(200);
    expect(await auditorias()).toHaveLength(0);
    await cliente(cen.dono.cookie).post(`${base}/arquivar`, { nomeConfirmacao: 'Grupo A' });
    expect((await cliente(cen.dono.cookie).post(`${base}/arquivar`, { nomeConfirmacao: 'Grupo A' })).status).toBe(200);
    expect(await auditorias()).toHaveLength(1);
  });

  it('404 (inexistente, malformado, admin comum), 401 sem sessão e 403 sem X-Pelada', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const corpo = { nomeConfirmacao: 'Grupo A' };
    const dono = cliente(cen.dono.cookie);
    expect((await dono.post(`/api/dono/grupos/${randomUUID()}/arquivar`, corpo)).status).toBe(404);
    expect((await dono.post('/api/dono/grupos/abc/arquivar', corpo)).status).toBe(404);
    expect((await dono.post(`/api/dono/grupos/${randomUUID()}/reativar`)).status).toBe(404);
    for (const acao of ['arquivar', 'reativar']) {
      const url = `/api/dono/grupos/${cen.grupoA.id}/${acao}`;
      expect((await cliente(cen.adminA.cookie).post(url, corpo)).status).toBe(404);
      expect((await cliente().post(url, corpo)).status).toBe(401);
      expect((await cliente(cen.dono.cookie, true).post(url, corpo)).status).toBe(403);
    }
  });
});
