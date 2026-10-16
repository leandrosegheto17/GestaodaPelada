import { previaSimulador } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../apoio/cliente.js';
import { usarDbDoWorker } from '../../apoio/db-worker.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const aptosDois = (quantos: number) => Array.from({ length: quantos }, (_, i) => ({ id: id(i + 1), so1oTempo: false }));
const corpoDois = { formato: 'dois_times', n: 7, k: 2, aptos: aptosDois(19) };

describe('POST /api/grupos/:g/simulador/previa (workerd)', () => {
  it('200 com as formas do mockup nos dois formatos e no insuficiente', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/simulador/previa`;
    const c = cliente(cen.adminA.cookie);

    const a = await c.post(url, corpoDois);
    expect(a.status).toBe(200);
    expect(a.headers.get('Cache-Control')).toBe('no-store');
    expect(previaSimulador.parse(a.corpo)).toEqual({
      formato: 'dois_times',
      valida: true,
      descricao: '2 times de 7 · 5 reservas',
      times: 2,
      reservas: 5,
      maiorNPossivel: null,
    });

    const b = await c.post(url, {
      formato: 'varios_times',
      n: 4,
      aptos: aptosDois(18).map(({ id: i }) => ({ id: i })),
    });
    expect(b.corpo).toEqual({
      formato: 'varios_times',
      valida: true,
      descricao: '4 times de 4 + 1 time incompleto de 2',
      times: 5,
      timesCompletos: 4,
      tamanhoIncompleto: 2,
    });

    const d = await c.post(url, { ...corpoDois, n: 11, aptos: aptosDois(18) });
    expect(d.corpo).toMatchObject({ valida: false, motivo: 'aptos_insuficientes', maiorNPossivel: 9 });
  });

  it.each([
    ['N 1', { ...corpoDois, n: 1 }],
    ['N 12', { ...corpoDois, n: 12 }],
    ['K 21', { ...corpoDois, k: 21 }],
    ['0 aptos', { ...corpoDois, aptos: [] }],
    ['61 aptos', { ...corpoDois, aptos: aptosDois(61) }],
    ['id repetido', { ...corpoDois, aptos: [...aptosDois(3), { id: id(1), so1oTempo: true }] }],
    ['k em vários times', { formato: 'varios_times', n: 4, k: 2, aptos: [{ id: id(1) }] }],
    ['campo extra', { ...corpoDois, eDono: true }],
  ])('%s → 422', async (_, corpo) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/simulador/previa`, corpo);
    expect(r.status).toBe(422);
  });

  it('sem X-Pelada 403; sem sessão 401; admin de outro grupo e id malformado 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/simulador/previa`;
    expect((await cliente(cen.adminA.cookie, true).post(url, corpoDois)).status).toBe(403);
    expect((await cliente().post(url, corpoDois)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).post(url, corpoDois)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).post('/api/grupos/nao-e-uuid/simulador/previa', corpoDois)).status).toBe(
      404,
    );
  });
});
