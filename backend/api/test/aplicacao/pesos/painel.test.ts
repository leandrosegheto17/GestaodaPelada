import { PESOS_PADRAO } from '@pelada/dominio';
import { painelPesos } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { montarPainelPesos } from '../../../src/aplicacao/pesos/painel.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDb } from '../../apoio/db-teste.js';
import { usarFabrica } from '../../apoio/fabrica.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const NOVOS = { presencaSemChuva: 1, presencaComChuva: 2, lesionadoSemChuva: 1, lesionadoComChuva: 2, expulso: -1 };

describe('montarPainelPesos (Postgres)', () => {
  it('vigente = a mais recente; histórico decrescente com a véspera como vigenteAte', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await pesos.criarPadrao(db, g, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-02-05',
      registradoPor: cen.adminA.id,
      agora: AGORA,
    });
    for (const d of ['2026-06-10', '2026-09-01']) {
      await pesos.criar(db, g, { pesos: NOVOS, vigenteDesde: d, hoje: d, registradoPor: cen.adminA.id, agora: AGORA });
    }
    const painel = await montarPainelPesos(db, g, '2026-10-22');
    expect(painelPesos.safeParse(painel).success).toBe(true);
    expect(painel.hoje).toBe('2026-10-22');
    expect(painel.vigente).toMatchObject({ vigenteDesde: '2026-09-01', registradoPor: 'Admin A' });
    expect(painel.vigente).not.toHaveProperty('vigenteAte');
    expect(painel.historico.map((h) => [h.vigenteDesde, h.vigenteAte])).toEqual([
      ['2026-06-10', '2026-08-31'],
      ['2026-02-05', '2026-06-09'],
    ]);
  });

  it('só o padrão: histórico vazio; sem configuração: erro', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await expect(montarPainelPesos(db, cen.grupoA.id, '2026-10-22')).rejects.toThrow();
    await pesos.criarPadrao(db, cen.grupoA.id, {
      pesos: PESOS_PADRAO,
      vigenteDesde: '2026-02-05',
      registradoPor: cen.adminA.id,
      agora: AGORA,
    });
    expect((await montarPainelPesos(db, cen.grupoA.id, '2026-10-22')).historico).toEqual([]);
  });

  it('não mistura configurações de outro grupo', async () => {
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
    const painel = await montarPainelPesos(db, cen.grupoA.id, '2026-10-22');
    expect(painel.vigente.registradoPor).toBe('Admin A');
    expect(painel.historico).toEqual([]);
  });
});
