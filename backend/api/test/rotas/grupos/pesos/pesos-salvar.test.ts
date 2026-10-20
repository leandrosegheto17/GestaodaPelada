import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { criarApp } from '../../../../src/entrada/app.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as pesos from '../../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const PESOS = {
  presencaSemChuva: 1,
  presencaComChuva: 2,
  lesionadoSemChuva: 1,
  lesionadoComChuva: 2,
  expulsoSemChuva: -1,
  expulsoComChuva: -2,
};
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), ...(cookie ? { cookie } : {}), semCsrf });

async function montar() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  await pesos.criarPadrao(db, cen.grupoA.id, {
    pesos: PESOS_PADRAO,
    vigenteDesde: '2026-02-05',
    registradoPor: cen.adminA.id,
    agora: AGORA,
  });
  const total = async () =>
    (await kyselyDe(db).selectFrom('config_pesos').select('id').where('grupo_id', '=', cen.grupoA.id).execute()).length;
  return { cen, total, url: `/api/grupos/${cen.grupoA.id}/pesos` };
}

describe('POST /api/grupos/:g/pesos: bordas e acesso (workerd)', () => {
  it('aceita -10 e 10', async () => {
    const { cen, url } = await montar();
    const r = await cliente(cen.adminA.cookie).post(url, {
      ...PESOS,
      expulsoSemChuva: -10,
      expulsoComChuva: -10,
      presencaSemChuva: 10,
    });
    expect(r.status).toBe(200);
  });

  it.each([[null], [undefined]])('422 com %s no campo', async (valor) => {
    const { cen, url, total } = await montar();
    const r = await cliente(cen.adminA.cookie).post(url, { ...PESOS, expulsoSemChuva: valor });
    expect(r.status).toBe(422);
    expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toContain('expulsoSemChuva');
    expect(await total()).toBe(1);
  });

  it('JSON inválido: 422; corpo acima do limite: 413', async () => {
    const { cen, url } = await montar();
    const app = criarApp({ relogio: relogioFixo('2026-10-22') });
    const enviar = async (corpo: string) => {
      const ctx = createExecutionContext();
      const resp = await app.fetch(
        new Request(`http://app.invalid${url}`, {
          method: 'POST',
          headers: { 'X-Pelada': '1', Cookie: cen.adminA.cookie, 'Content-Type': 'application/json' },
          body: corpo,
        }),
        env,
        ctx,
      );
      await waitOnExecutionContext(ctx);
      return resp.status;
    };
    expect(await enviar('{nao-json')).toBe(422);
    expect(await enviar(JSON.stringify({ ...PESOS, lixo: 'x'.repeat(17 * 1024) }))).toBe(413);
  });

  it('sem X-Pelada: 403; sem sessão: 401; outro grupo e uuid malformado: 404, sem gravar', async () => {
    const { cen, url, total } = await montar();
    expect((await cliente(cen.adminA.cookie, true).post(url, PESOS)).status).toBe(403);
    expect((await cliente().post(url, PESOS)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).post(url, PESOS)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).post('/api/grupos/nao-e-uuid/pesos', PESOS)).status).toBe(404);
    expect(await total()).toBe(1);
  });
});
