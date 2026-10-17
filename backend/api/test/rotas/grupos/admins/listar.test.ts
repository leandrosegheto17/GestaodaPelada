import { erroPadrao, listaAdmins } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string) =>
  clienteTeste({ relogio: relogioFixo('2026-10-16'), ...(cookie ? { cookie } : {}) });

describe('GET /api/grupos/:g/admins: forma e isolamento (workerd)', () => {
  it('mesmas chaves do exemplo do mockup, sem cache e sem dado de senha', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/admins`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toContain('no-store');
    // chaves de .md/mockup/respostas/admins-quinta.json
    const exemplo = {
      admins: [{ contaId: 1, nome: 1, email: 1, acessaFinanceiro: 1, voce: 1 }],
      podeGerirFinanceiro: true,
    };
    const lista = listaAdmins.parse(r.corpo);
    expect(Object.keys(lista).sort()).toEqual(Object.keys(exemplo).sort());
    expect(Object.keys(lista.admins[0]!).sort()).toEqual(Object.keys(exemplo.admins[0]!).sort());
    expect(lista.admins.filter((a) => a.voce)).toHaveLength(1);
    expect(r.texto).not.toMatch(/senha|hash/i);
  });

  it('quem pede sem financeiro vê o dos outros mas não gere', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminASemFinanceiro.cookie).get(`/api/grupos/${cen.grupoA.id}/admins`);
    const lista = listaAdmins.parse(r.corpo);
    expect(lista.podeGerirFinanceiro).toBe(false);
    expect(lista.admins.find((a) => !a.voce)?.acessaFinanceiro).toBe(true);
  });

  it('grupo com 1 admin devolve lista de 1', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminB.cookie).get(`/api/grupos/${cen.grupoB.id}/admins`);
    expect(listaAdmins.parse(r.corpo).admins).toHaveLength(1);
  });

  it('admin de outro grupo e dono sem vínculo: 404; sem sessão: 401', async () => {
    const cen = await montarCenario(await abrir(), fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/admins`;
    for (const cookie of [cen.adminB.cookie, cen.dono.cookie]) {
      const r = await cliente(cookie).get(url);
      expect(r.status).toBe(404);
      expect(erroPadrao.parse(r.corpo).erro.codigo).toBe('nao_encontrado');
    }
    expect((await cliente().get(url)).status).toBe(401);
  });
});
