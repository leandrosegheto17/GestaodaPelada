import { erroPadrao, mesFinanceiro } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../../../src/infraestrutura/db/index.js';
import * as financeiro from '../../../../src/infraestrutura/db/repositorios/financeiro.js';
import * as jogadores from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarConfig, criarLancamento } from '../../../apoio/fabricas/financeiro.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-22T15:00:00Z');
const cliente = (cookie?: string) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), ...(cookie ? { cookie } : {}) });

async function grupoComCaixa() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  await criarConfig(db, g, {
    mensalidadeCentavos: 7_500,
    saldoInicialCentavos: 35_000,
    dataSaldoInicial: '2026-02-05',
  });
  const ana = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: '2026-01-01' });
  await criarJogador(db, g, cen.adminA.id, { apelido: 'Édson', dataEntrada: '2026-01-01' });
  await criarJogador(db, g, cen.adminA.id, { apelido: 'Beto', dataEntrada: '2026-01-01' });
  await emTransacao(db, (tx) =>
    financeiro.marcar(tx, g, {
      jogadorId: ana,
      mes: '2026-10',
      lancamento: { data: '2026-10-02', descricao: 'Mensalidade Ana 10/2026', valorCentavos: 7_500 },
      autor: cen.adminA.id,
      agora: AGORA,
    }),
  );
  await criarLancamento(db, g, cen.adminA.id, { tipo: 'saida', data: '2026-10-05', valorCentavos: 80_000 });
  await criarLancamento(db, g, cen.adminA.id, {
    tipo: 'entrada',
    data: '2026-10-10',
    descricao: 'Patrocínio',
    valorCentavos: 20_000,
  });
  return { db, cen, g, url: `/api/grupos/${g}/financeiro/mes` };
}

describe('GET /api/grupos/:g/financeiro/mes (workerd)', () => {
  it('mês corrente: config, saldo, resumo, ativos com a marcação e lançamentos com o vínculo', async () => {
    const { cen, url } = await grupoComCaixa();
    const r = await cliente(cen.adminA.cookie).get(url);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    const mes = mesFinanceiro.parse(r.corpo);
    expect(mes.mes).toBe('2026-10');
    expect(mes.config).toEqual({
      mensalidadeCentavos: 7_500,
      saldoInicialCentavos: 35_000,
      dataSaldoInicial: '2026-02-05',
    });
    expect(mes.saldoAtualCentavos).toBe(35_000 + 7_500 + 20_000 - 80_000);
    expect(mes.resumoMes).toEqual({
      entradasCentavos: 27_500,
      saidasCentavos: 80_000,
      resultadoCentavos: -52_500,
      naoPagaram: 2,
    });
    expect(mes.pagamentos.map((p) => [p.apelido, p.pagou])).toEqual([
      ['Ana', true],
      ['Beto', false],
      ['Édson', false],
    ]);
    expect(mes.lancamentos.map((l) => [l.descricao, l.mensalidade])).toEqual([
      ['Patrocínio', false],
      ['Aluguel da quadra', false],
      ['Mensalidade Ana 10/2026', true],
    ]);
    expect(mes.navegacao).toEqual({ mesAnterior: '2026-09', mesSeguinte: null });
  });

  it('mês passado sem lançamentos: listas vazias, resumo zerado e o mesmo saldo atual', async () => {
    const { cen, url } = await grupoComCaixa();
    const r = await cliente(cen.adminA.cookie).get(`${url}?mes=2026-07`);
    const mes = mesFinanceiro.parse(r.corpo);
    expect(mes.lancamentos).toEqual([]);
    expect(mes.resumoMes).toMatchObject({
      entradasCentavos: 0,
      saidasCentavos: 0,
      resultadoCentavos: 0,
      naoPagaram: 3,
    });
    expect(mes.saldoAtualCentavos).toBe(35_000 + 7_500 + 20_000 - 80_000);
    expect(mes.navegacao).toEqual({ mesAnterior: '2026-06', mesSeguinte: '2026-08' });
  });

  it('sem configuração: a forma vazia', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/financeiro/mes`);
    expect(mesFinanceiro.parse(r.corpo)).toEqual({
      mes: '2026-10',
      hoje: '2026-10-22',
      navegacao: { mesAnterior: null, mesSeguinte: null },
      config: null,
      saldoAtualCentavos: null,
      resumoMes: null,
      pagamentos: [],
      lancamentos: [],
    });
  });

  it('jogador inativado antes do mês não aparece; o que entra no meio do mês aparece', async () => {
    const { db, cen, g, url } = await grupoComCaixa();
    const saiu = await criarJogador(db, g, cen.adminA.id, { apelido: 'Saiu', dataEntrada: '2026-01-01' });
    await jogadores.inativar(db, g, saiu, '2026-09-10');
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Chegou', dataEntrada: '2026-10-20' });
    const mes = mesFinanceiro.parse((await cliente(cen.adminA.cookie).get(url)).corpo);
    const nomes = mes.pagamentos.map((p) => p.apelido);
    expect(nomes).not.toContain('Saiu');
    expect(nomes).toContain('Chegou');
  });

  it('?mes inválido ou fora do histórico do caixa: 422 em mes', async () => {
    const { cen, url } = await grupoComCaixa();
    for (const ruim of ['2026-13', 'abc', '2026-11', '2026-01']) {
      const r = await cliente(cen.adminA.cookie).get(`${url}?mes=${ruim}`);
      expect(r.status, ruim).toBe(422);
      expect(Object.keys((r.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['mes']);
    }
  });

  it('admin sem a permissão do financeiro: 403; admin de outro grupo: 404; sem sessão: 401', async () => {
    const { cen, url } = await grupoComCaixa();
    const sem = await cliente(cen.adminASemFinanceiro.cookie).get(url);
    expect(sem.status).toBe(403);
    expect(erroPadrao.parse(sem.corpo).erro.codigo).toBe('sem_permissao_financeiro');
    expect((await cliente(cen.adminB.cookie).get(url)).status).toBe(404);
    expect((await cliente().get(url)).status).toBe(401);
  });

  it('os dados do grupo B nunca entram', async () => {
    const { db, cen, url } = await grupoComCaixa();
    await criarConfig(db, cen.grupoB.id);
    await criarLancamento(db, cen.grupoB.id, cen.adminB.id, { descricao: 'Segredo do B', valorCentavos: 999_999 });
    const r = await cliente(cen.adminA.cookie).get(url);
    expect(r.texto).not.toContain('Segredo do B');
  });
});
