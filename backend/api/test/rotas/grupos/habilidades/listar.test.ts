import { listaHabilidades } from '@pelada/contrato';
import { HABILIDADES_INICIAIS } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import * as habilidades from '../../../../src/infraestrutura/db/repositorios/habilidades.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), ...(cookie ? { cookie } : {}) });

describe('GET /api/grupos/:g/habilidades (workerd)', () => {
  it('catálogo da RN-18 na ordem de cadastro, no formato do contrato', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await habilidades.criarCatalogoInicial(db, cen.grupoA.id, HABILIDADES_INICIAIS);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/habilidades`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const lista = listaHabilidades.parse(r.corpo);
    expect(lista.habilidades.map((h) => h.nome)).toEqual([...HABILIDADES_INICIAIS]);
    expect(Object.keys(lista.habilidades[0]!).sort()).toEqual(['id', 'nome']);
  });

  it('grupo sem habilidade devolve lista vazia', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/habilidades`);
    expect(r.status).toBe(200);
    expect(r.corpo).toEqual({ habilidades: [] });
  });

  it('não mostra a habilidade de outro grupo; outro admin leva 404; sem sessão, 401; id malformado, 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await habilidades.criar(db, cen.grupoB.id, 'Só do B');
    const doA = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/habilidades`);
    expect(doA.texto).not.toContain('Só do B');
    const alheio = await cliente(cen.adminB.cookie).get(`/api/grupos/${cen.grupoA.id}/habilidades`);
    expect(alheio.status).toBe(404);
    expect((await cliente().get(`/api/grupos/${cen.grupoA.id}/habilidades`)).status).toBe(401);
    expect((await cliente(cen.adminA.cookie).get('/api/grupos/nao-e-uuid/habilidades')).status).toBe(404);
  });
});
