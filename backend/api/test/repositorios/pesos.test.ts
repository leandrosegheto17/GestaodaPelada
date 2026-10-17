import pg from 'pg';
import { describe, expect, it, vi } from 'vitest';
import * as pesos from '../../src/infraestrutura/db/repositorios/pesos.js';
import { VigenciaNoPassado } from '../../src/infraestrutura/db/repositorios/pesos.js';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { criarBase } from '../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const relogio = relogioFixo('2026-10-16');
const AGORA = new Date(relogio.agoraIso());
const HOJE = relogio.hoje();
const somarDias = (data: string, dias: number): string =>
  new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const PADRAO: pesos.Pesos = {
  presencaSemChuva: 1,
  presencaComChuva: 1,
  lesionadoSemChuva: 1,
  lesionadoComChuva: 1,
  expulso: -1,
};
const D1 = somarDias(HOJE, -30);
const D2 = somarDias(HOJE, 30);

describe('repositório de pesos', () => {
  it('criarPadrao vale na data e traz o nome do autor', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await pesos.criarPadrao(db, base.grupo.id, {
      pesos: PADRAO,
      vigenteDesde: D1,
      registradoPor: base.contaId,
      agora: AGORA,
    });
    const vigente = await pesos.vigenteEm(db, base.grupo.id, HOJE);
    expect(vigente).toMatchObject({ ...PADRAO, vigenteDesde: D1, registradoPor: 'Conta de Teste' });
  });

  it('vigência por data e histórico em ordem decrescente com vigenteAte', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    await pesos.criarPadrao(db, g, { pesos: PADRAO, vigenteDesde: D1, registradoPor: base.contaId, agora: AGORA });
    await pesos.criar(db, g, {
      pesos: { ...PADRAO, presencaComChuva: 2 },
      vigenteDesde: D2,
      hoje: D2,
      registradoPor: base.contaId,
      agora: AGORA,
    });
    expect((await pesos.vigenteEm(db, g, D1))?.presencaComChuva).toBe(1);
    expect((await pesos.vigenteEm(db, g, somarDias(D2, -1)))?.presencaComChuva).toBe(1);
    expect((await pesos.vigenteEm(db, g, D2))?.presencaComChuva).toBe(2);
    expect(await pesos.vigenteEm(db, g, somarDias(D1, -1))).toBeNull();
    const h = await pesos.historico(db, g);
    expect(h.map((c) => [c.vigenteDesde, c.vigenteAte])).toEqual([
      [D2, null],
      [D1, somarDias(D2, -1)],
    ]);
    expect(JSON.stringify(h)).not.toContain('@');
  });

  it('vigência no passado é recusada sem gravar; mesma data substitui', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    const nova = {
      pesos: PADRAO,
      vigenteDesde: somarDias(HOJE, -1),
      hoje: HOJE,
      registradoPor: base.contaId,
      agora: AGORA,
    };
    await expect(pesos.criar(db, g, nova)).rejects.toBeInstanceOf(VigenciaNoPassado);
    expect(await pesos.historico(db, g)).toEqual([]);
    const futura = { ...nova, vigenteDesde: HOJE };
    expect(await pesos.criar(db, g, futura)).toEqual({ substituiu: false });
    expect(await pesos.criar(db, g, { ...futura, pesos: { ...PADRAO, expulso: -2 } })).toEqual({ substituiu: true });
    const h = await pesos.historico(db, g);
    expect(h).toHaveLength(1);
    expect(h[0]?.expulso).toBe(-2);
  });

  it('isola por grupo', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    await pesos.criarPadrao(db, base.grupo.id, {
      pesos: PADRAO,
      vigenteDesde: D1,
      registradoPor: base.contaId,
      agora: AGORA,
    });
    expect(await pesos.vigenteEm(db, base.outroGrupo.id, HOJE)).toBeNull();
    expect(await pesos.historico(db, base.outroGrupo.id)).toEqual([]);
  });

  it('criar em A não muda B', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const [a, b] = [base.grupo.id, base.outroGrupo.id];
    const nova = { pesos: PADRAO, vigenteDesde: HOJE, hoje: HOJE, registradoPor: base.contaId, agora: AGORA };
    await pesos.criar(db, b, nova);
    const antes = await pesos.historico(db, b);
    await pesos.criar(db, a, { ...nova, pesos: { ...PADRAO, expulso: -3 } });
    await pesos.criar(db, a, { ...nova, vigenteDesde: D2, pesos: { ...PADRAO, expulso: -4 } });
    expect(await pesos.historico(db, b)).toEqual(antes);
    expect((await pesos.vigenteEm(db, b, D2))?.expulso).toBe(PADRAO.expulso);
  });

  it('historico com 3 configurações usa 1 consulta', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    const base3 = { hoje: HOJE, registradoPor: base.contaId, agora: AGORA, pesos: PADRAO };
    for (const dias of [0, 10, 20]) {
      await pesos.criar(db, g, { ...base3, vigenteDesde: somarDias(HOJE, dias) });
    }
    const consultas = vi.spyOn(pg.Client.prototype, 'query');
    try {
      expect(await pesos.historico(db, g)).toHaveLength(3);
      expect(consultas).toHaveBeenCalledTimes(1);
    } finally {
      consultas.mockRestore();
    }
  });
});
