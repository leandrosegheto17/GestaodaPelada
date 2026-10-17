import { configFinanceira } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as financeiro from '../../../../src/infraestrutura/db/repositorios/financeiro.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });
const VALIDA = { mensalidadeCentavos: 7_500, saldoInicialCentavos: 35_000, dataSaldoInicial: '2026-02-05' };

const auditoriaDe = async (db: Awaited<ReturnType<typeof abrir>>, grupoId: string) =>
  kyselyDe(db)
    .selectFrom('auditoria')
    .select(['acao', 'autor_conta_id', 'resumo'])
    .where('grupo_id', '=', grupoId)
    .execute();

describe('PUT /api/grupos/:g/financeiro/config (workerd)', () => {
  it('grava a configuração, responde com ela e audita com o autor da sessão', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const r = await cliente(cen.adminA.cookie).put(`/api/grupos/${g}/financeiro/config`, VALIDA);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(configFinanceira.parse(r.corpo)).toEqual(VALIDA);
    expect(await financeiro.lerConfig(db, g)).toEqual(VALIDA);
    expect(await auditoriaDe(db, g)).toEqual([
      expect.objectContaining({ acao: 'financeiro_config_alterada', autor_conta_id: cen.adminA.id }),
    ]);
  });

  it('segunda gravação com mensalidade nula atualiza a mesma linha e audita antes e depois', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await cliente(cen.adminA.cookie).put(`/api/grupos/${g}/financeiro/config`, VALIDA);
    const r = await cliente(cen.adminA.cookie).put(`/api/grupos/${g}/financeiro/config`, {
      ...VALIDA,
      mensalidadeCentavos: null,
      saldoInicialCentavos: -2_500,
    });
    expect(r.status).toBe(200);
    expect(await financeiro.lerConfig(db, g)).toMatchObject({
      mensalidadeCentavos: null,
      saldoInicialCentavos: -2_500,
    });
    const linhas = await auditoriaDe(db, g);
    expect(linhas).toHaveLength(2);
    expect(linhas.at(-1)?.resumo).toMatchObject({
      antesMensalidade: 7_500,
      depoisMensalidade: null,
      depoisSaldoInicial: -2_500,
    });
  });

  it.each([
    ['mensalidade 0', { mensalidadeCentavos: 0 }],
    ['mensalidade 100.000.000', { mensalidadeCentavos: 100_000_000 }],
    ['mensalidade 75,5', { mensalidadeCentavos: 75.5 }],
    ['mensalidade "75"', { mensalidadeCentavos: '75' }],
    ['saldo -100.000.000', { saldoInicialCentavos: -100_000_000 }],
    ['saldo 100.000.000', { saldoInicialCentavos: 100_000_000 }],
    ['data impossível', { dataSaldoInicial: '2026-02-30' }],
    ['data em texto', { dataSaldoInicial: 'abc' }],
    ['campo extra', { grupoId: 'x' }],
  ])('%s → 422 com campos', async (_, parcial) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).put(`/api/grupos/${cen.grupoA.id}/financeiro/config`, {
      ...VALIDA,
      ...parcial,
    });
    expect(r.status).toBe(422);
    expect(await financeiro.lerConfig(db, cen.grupoA.id)).toBeNull();
  });

  it('data do saldo inicial no futuro → 422 em dataSaldoInicial', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).put(`/api/grupos/${cen.grupoA.id}/financeiro/config`, {
      ...VALIDA,
      dataSaldoInicial: '2026-10-23',
    });
    expect(r.status).toBe(422);
    expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['dataSaldoInicial']);
  });

  it('sem X-Pelada 403; sem permissão do financeiro 403; outro grupo 404; sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/financeiro/config`;
    expect((await cliente(cen.adminA.cookie, true).put(url, VALIDA)).status).toBe(403);
    expect((await cliente(cen.adminASemFinanceiro.cookie).put(url, VALIDA)).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).put(url, VALIDA)).status).toBe(404);
    expect((await cliente().put(url, VALIDA)).status).toBe(401);
    expect(await financeiro.lerConfig(db, cen.grupoA.id)).toBeNull();
  });
});
