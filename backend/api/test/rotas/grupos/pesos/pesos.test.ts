import { PESOS_PADRAO } from '@pelada/dominio';
import { erroPadrao, painelPesos } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
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
const cliente = (cookie: string, data = '2026-10-22') => clienteTeste({ relogio: relogioFixo(data), cookie });
const NOVOS = {
  presencaSemChuva: 1,
  presencaComChuva: 2,
  lesionadoSemChuva: 1,
  lesionadoComChuva: 2,
  expulsoSemChuva: -1,
  expulsoComChuva: -2,
};

async function comPadrao(db: Awaited<ReturnType<typeof abrir>>, grupoId: string, autor: string) {
  await pesos.criarPadrao(db, grupoId, {
    pesos: PESOS_PADRAO,
    vigenteDesde: '2026-02-05',
    registradoPor: autor,
    agora: AGORA,
  });
}

describe('GET /api/grupos/:g/pesos (workerd)', () => {
  it('vigente e histórico com autor e vigência, sem e-mail', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await comPadrao(db, cen.grupoA.id, cen.adminA.id);
    await pesos.criar(db, cen.grupoA.id, {
      pesos: NOVOS,
      vigenteDesde: '2026-09-01',
      hoje: '2026-09-01',
      registradoPor: cen.adminA.id,
      agora: AGORA,
    });
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/pesos`);
    expect(r.status).toBe(200);
    const painel = painelPesos.parse(r.corpo);
    expect(painel.vigente).toMatchObject({ vigenteDesde: '2026-09-01', registradoPor: 'Admin A', presencaComChuva: 2 });
    expect(painel.historico).toMatchObject([{ vigenteDesde: '2026-02-05', vigenteAte: '2026-08-31' }]);
    expect(r.texto).not.toContain('@');
  });

  it('só a configuração padrão: histórico vazio; grupo sem configuração: 500 sem detalhe', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const vazio = await cliente(cen.adminB.cookie).get(`/api/grupos/${cen.grupoB.id}/pesos`);
    expect(vazio.status).toBe(500);
    expect(erroPadrao.safeParse(vazio.corpo).success).toBe(true);
    await comPadrao(db, cen.grupoB.id, cen.adminB.id);
    const r = await cliente(cen.adminB.cookie).get(`/api/grupos/${cen.grupoB.id}/pesos`);
    expect((r.corpo as { historico: unknown[] }).historico).toEqual([]);
  });
});

describe('POST /api/grupos/:g/pesos (workerd)', () => {
  it('vigência = hoje do servidor; anterior ganha vigenteAte; auditoria; mesma data substitui', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await comPadrao(db, cen.grupoA.id, cen.adminA.id);
    const url = `/api/grupos/${cen.grupoA.id}/pesos`;
    const r = await cliente(cen.adminA.cookie).post(url, NOVOS);
    expect(r.status).toBe(200);
    const painel = painelPesos.parse(r.corpo);
    expect(painel.vigente.vigenteDesde).toBe('2026-10-22');
    expect(painel.historico[0]?.vigenteAte).toBe('2026-10-21');
    const outra = await cliente(cen.adminA.cookie).post(url, { ...NOVOS, expulsoSemChuva: -3 });
    expect(painelPesos.parse(outra.corpo).historico).toHaveLength(1);
    const acoes = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('acao')
      .where('grupo_id', '=', cen.grupoA.id)
      .orderBy('id')
      .execute();
    expect(acoes.map((a) => a.acao)).toEqual(['pesos_configurados', 'pesos_substituidos']);
  });

  it.each([
    [{ ...NOVOS, expulsoSemChuva: 11 }, 'expulsoSemChuva'],
    [{ ...NOVOS, expulsoComChuva: -11 }, 'expulsoComChuva'],
    [{ ...NOVOS, expulso: -1 }, 'corpo'],
    [{ ...NOVOS, expulsoSemChuva: -11 }, 'expulsoSemChuva'],
    [{ ...NOVOS, presencaComChuva: 1.5 }, 'presencaComChuva'],
    [{ ...NOVOS, presencaComChuva: '2' }, 'presencaComChuva'],
    [{ ...NOVOS, vigenteDesde: '2026-01-01' }, 'corpo'],
    [{ presencaSemChuva: 1 }, 'presencaComChuva'],
  ])('422: %j', async (corpo, campo) => {
    const cen = await montarCenario(await abrir(), fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/pesos`, corpo);
    expect(r.status).toBe(422);
    expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toContain(campo);
  });
});
