import { erroPadrao, lancamento } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../../src/infraestrutura/db/cliente.js';
import * as financeiro from '../../../../../src/infraestrutura/db/repositorios/financeiro.js';
import { montarCenario } from '../../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../../apoio/db-worker.js';
import { usarFabrica } from '../../../../apoio/fabrica.js';
import { relogioFixo } from '../../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });
const VALIDO = { tipo: 'saida', data: '2026-10-05', descricao: 'Aluguel da quadra', valorCentavos: 80_000 };

const todos = (db: Awaited<ReturnType<typeof abrir>>, g: string) =>
  financeiro.lancamentosDoMes(db, g, '2026-01-01', '2026-12-31');

describe('POST /api/grupos/:g/financeiro/lancamentos (workerd)', () => {
  it.each([
    ['saida', 80_000],
    ['entrada', 12_300],
  ])(
    '%s: 201 com o lançamento, mensalidade falsa, alteradoPor com o nome e auditoria sem a descrição',
    async (tipo, valor) => {
      const db = await abrir();
      const cen = await montarCenario(db, fabrica);
      const g = cen.grupoA.id;
      const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/financeiro/lancamentos`, {
        ...VALIDO,
        tipo,
        valorCentavos: valor,
      });
      expect(r.status).toBe(201);
      expect(r.headers.get('Cache-Control')).toBe('no-store');
      const criado = lancamento.parse(r.corpo);
      expect(criado).toMatchObject({ tipo, valorCentavos: valor, mensalidade: false, alteradoPor: 'Admin A' });
      expect(await todos(db, g)).toHaveLength(1);
      const auditoria = await kyselyDe(db)
        .selectFrom('auditoria')
        .select(['acao', 'autor_conta_id', 'resumo'])
        .where('grupo_id', '=', g)
        .execute();
      expect(auditoria).toEqual([
        {
          acao: 'lancamento_criado',
          autor_conta_id: cen.adminA.id,
          resumo: { tipo, data: '2026-10-05', valorCentavos: valor },
        },
      ]);
    },
  );

  it.each([
    ['descrição vazia', { descricao: '' }],
    ['descrição só com espaços', { descricao: '   ' }],
    ['descrição de 81 caracteres', { descricao: 'x'.repeat(81) }],
    ['valor 0', { valorCentavos: 0 }],
    ['valor negativo', { valorCentavos: -1 }],
    ['valor decimal', { valorCentavos: 12.5 }],
    ['valor em texto', { valorCentavos: '100' }],
    ['valor 100.000.000', { valorCentavos: 100_000_000 }],
    ['tipo fora do enum', { tipo: 'transferencia' }],
    ['data impossível', { data: '2026-02-30' }],
    ['data em outro formato', { data: '30/10/2026' }],
    ['campo extra', { mensalidade: true }],
  ])('%s → 422', async (_, parcial) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/financeiro/lancamentos`, {
      ...VALIDO,
      ...parcial,
    });
    expect(r.status).toBe(422);
    expect(await todos(db, cen.grupoA.id)).toEqual([]);
  });

  it.each([
    [1, 1],
    [80, 99_999_999],
  ])('descrição de %i caractere(s) e valor %i são aceitos', async (tamanho, valor) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/financeiro/lancamentos`, {
      ...VALIDO,
      descricao: 'x'.repeat(tamanho),
      valorCentavos: valor,
    });
    expect(r.status).toBe(201);
  });

  it('sem corpo ou com JSON inválido → 422', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/financeiro/lancamentos`);
    expect(r.status).toBe(422);
  });

  it('sem X-Pelada 403; sem a permissão do financeiro 403 (forma própria); outro grupo 404; sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const url = `/api/grupos/${cen.grupoA.id}/financeiro/lancamentos`;
    expect((await cliente(cen.adminA.cookie, true).post(url, VALIDO)).status).toBe(403);
    const sem = await cliente(cen.adminASemFinanceiro.cookie).post(url, VALIDO);
    expect(sem.status).toBe(403);
    expect(erroPadrao.parse(sem.corpo).erro.codigo).toBe('sem_permissao_financeiro');
    expect((await cliente(cen.adminB.cookie).post(url, VALIDO)).status).toBe(404);
    expect((await cliente().post(url, VALIDO)).status).toBe(401);
    expect(await todos(db, cen.grupoA.id)).toEqual([]);
  });
});
