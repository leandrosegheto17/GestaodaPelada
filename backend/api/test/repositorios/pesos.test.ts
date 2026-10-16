import { describe, expect, it } from 'vitest';
import * as pesos from '../../src/infraestrutura/db/repositorios/pesos.js';
import { VigenciaNoPassado } from '../../src/infraestrutura/db/repositorios/pesos.js';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const PADRAO: pesos.Pesos = {
  presencaSemChuva: 1,
  presencaComChuva: 1,
  lesionadoSemChuva: 1,
  lesionadoComChuva: 1,
  expulso: -1,
};
const D1 = '2026-02-05';
const D2 = '2026-09-01';

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
    const vigente = await pesos.vigenteEm(db, base.grupo.id, '2026-10-16');
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
    expect((await pesos.vigenteEm(db, g, '2026-08-31'))?.presencaComChuva).toBe(1);
    expect((await pesos.vigenteEm(db, g, D2))?.presencaComChuva).toBe(2);
    expect(await pesos.vigenteEm(db, g, '2026-02-04')).toBeNull();
    const h = await pesos.historico(db, g);
    expect(h.map((c) => [c.vigenteDesde, c.vigenteAte])).toEqual([
      [D2, null],
      [D1, '2026-08-31'],
    ]);
    expect(JSON.stringify(h)).not.toContain('@');
  });

  it('vigência no passado é recusada sem gravar; mesma data substitui', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const g = base.grupo.id;
    const nova = {
      pesos: PADRAO,
      vigenteDesde: '2026-10-15',
      hoje: '2026-10-16',
      registradoPor: base.contaId,
      agora: AGORA,
    };
    await expect(pesos.criar(db, g, nova)).rejects.toBeInstanceOf(VigenciaNoPassado);
    expect(await pesos.historico(db, g)).toEqual([]);
    const futura = { ...nova, vigenteDesde: '2026-10-16' };
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
    expect(await pesos.vigenteEm(db, base.outroGrupo.id, '2026-10-16')).toBeNull();
    expect(await pesos.historico(db, base.outroGrupo.id)).toEqual([]);
  });
});
