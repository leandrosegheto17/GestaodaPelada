import { habilidade } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import * as habilidades from '../../../../src/infraestrutura/db/repositorios/habilidades.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

const ERRO_EM_USO = {
  erro: {
    codigo: 'validacao',
    mensagem: 'Corrija os campos indicados.',
    campos: { nome: 'Já existe uma habilidade com esse nome.' },
  },
};

describe('POST /api/grupos/:g/habilidades (workerd)', () => {
  it('201 com a habilidade criada e no-store', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/habilidades`, { nome: 'Cabeceio' });
    expect(r.status).toBe(201);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(habilidade.parse(r.corpo).nome).toBe('Cabeceio');
  });

  it.each([
    ['A', 422],
    ['AB', 201],
    ['x'.repeat(30), 201],
    ['x'.repeat(31), 422],
    ['   ', 422],
  ])('nome %j → %i', async (nome, status) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/habilidades`, { nome });
    expect(r.status).toBe(status);
    if (status === 422) expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['nome']);
  });

  it('nome repetido sem distinguir caixa: 422 na forma do mockup', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await habilidades.criar(db, cen.grupoA.id, 'Passe');
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/habilidades`, { nome: 'PASSE' });
    expect(r.status).toBe(422);
    expect(r.corpo).toEqual(ERRO_EM_USO);
  });

  it.each([{}, { nome: 5 }, { nome: 'Passe', grupoId: 'x' }])('corpo %j → 422', async (corpo) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/habilidades`, corpo);
    expect(r.status).toBe(422);
  });

  it('corpo grande 413, sem X-Pelada 403, sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/habilidades`;
    expect((await cliente(cen.adminA.cookie).post(url, { nome: 'x'.repeat(20_000) })).status).toBe(413);
    expect((await cliente(cen.adminA.cookie, true).post(url, { nome: 'Passe' })).status).toBe(403);
    expect((await cliente().post(url, { nome: 'Passe' })).status).toBe(401);
  });

  it('admin de outro grupo leva 404 e nada é gravado', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminB.cookie).post(`/api/grupos/${cen.grupoA.id}/habilidades`, { nome: 'Invasor' });
    expect(r.status).toBe(404);
    expect(await habilidades.listar(db, cen.grupoA.id)).toEqual([]);
    expect(await habilidades.listar(db, cen.grupoB.id)).toEqual([]);
  });
});
