import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import * as pesos from '../../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const cliente = (cookie?: string) => clienteTeste({ relogio: relogioFixo('2026-10-22'), cookie });

describe('GET /api/grupos/:g/pesos: acesso (workerd)', () => {
  it('no-store; sem sessão 401; outro grupo, inexistente e uuid malformado: 404 idêntico', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await pesos.criarPadrao(db, cen.grupoA.id, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-02-05',
      registradoPor: cen.adminA.id,
      agora: AGORA,
    });
    const ok = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/pesos`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Cache-Control')).toContain('no-store');
    expect((await cliente().get(`/api/grupos/${cen.grupoA.id}/pesos`)).status).toBe(401);
    const outros = await Promise.all(
      [cen.grupoA.id, '00000000-0000-4000-8000-000000000000', 'nao-e-uuid'].map((id, i) =>
        cliente(i === 0 ? cen.adminB.cookie : cen.adminA.cookie).get(`/api/grupos/${id}/pesos`),
      ),
    );
    expect(outros.map((o) => o.status)).toEqual([404, 404, 404]);
    expect(new Set(outros.map((o) => o.texto)).size).toBe(1);
  });

  it('configurações do grupo B nunca aparecem em A', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await pesos.criarPadrao(db, cen.grupoA.id, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-02-05',
      registradoPor: cen.adminA.id,
      agora: AGORA,
    });
    await pesos.criarPadrao(db, cen.grupoB.id, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-03-05',
      registradoPor: cen.adminB.id,
      agora: AGORA,
    });
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/pesos`);
    expect(r.texto).not.toContain('Admin B');
    expect(r.texto).not.toContain('2026-03-05');
  });
});
