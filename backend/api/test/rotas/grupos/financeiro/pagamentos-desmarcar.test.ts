import { describe, expect, it, vi } from 'vitest';
import { desmarcarPagamento } from '../../../../src/aplicacao/financeiro/desmarcar-pagamento.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { emTransacao } from '../../../../src/infraestrutura/db/index.js';
import * as auditoria from '../../../../src/infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../../../src/infraestrutura/db/repositorios/financeiro.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarLancamento } from '../../../apoio/fabricas/financeiro.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

vi.mock('../../../../src/infraestrutura/db/repositorios/auditoria.js', async (original) => {
  const real = await original<typeof import('../../../../src/infraestrutura/db/repositorios/auditoria.js')>();
  return { ...real, registrar: vi.fn(real.registrar) };
});

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-22T15:00:00Z');
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

async function cenario() {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const ana = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: '2026-01-01' });
  const marcar = (jogadorId: string, mes: string, comEntrada: boolean) =>
    emTransacao(db, (tx) =>
      financeiro.marcar(tx, g, {
        jogadorId,
        mes,
        lancamento: comEntrada ? { data: '2026-10-02', descricao: `Mensalidade ${mes}`, valorCentavos: 7_500 } : null,
        autor: cen.adminA.id,
        agora: AGORA,
      }),
    );
  return {
    db,
    cen,
    g,
    ana,
    marcar,
    url: (id: string, mes: string) => `/api/grupos/${g}/financeiro/pagamentos/${id}/${mes}`,
  };
}

const lancamentosDe = (db: Awaited<ReturnType<typeof abrir>>, g: string) =>
  financeiro.lancamentosDoMes(db, g, '2026-10-01', '2026-10-31');

describe('DELETE /api/grupos/:g/financeiro/pagamentos/:jogadorId/:mes (workerd)', () => {
  it('remove a marcação e a entrada vinculada, deixa os outros lançamentos e audita', async () => {
    const { db, cen, g, ana, marcar, url } = await cenario();
    await marcar(ana, '2026-10', true);
    await criarLancamento(db, g, cen.adminA.id, { descricao: 'Aluguel' });
    const r = await cliente(cen.adminA.cookie).delete(url(ana, '2026-10'));
    expect(r.status).toBe(204);
    expect(await financeiro.pagamentosDoMes(db, g, '2026-10')).toEqual([]);
    expect((await lancamentosDe(db, g)).map((l) => l.descricao)).toEqual(['Aluguel']);
    const auditoria = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'resumo'])
      .where('grupo_id', '=', g)
      .execute();
    expect(auditoria).toEqual([
      { acao: 'pagamento_desmarcado', resumo: { mes: '2026-10', valorRemovidoCentavos: 7_500 } },
    ]);
  });

  it('marcação sem entrada: 204 e nenhum lançamento tocado; marcar de novo funciona', async () => {
    const { db, cen, g, ana, marcar, url } = await cenario();
    await marcar(ana, '2026-10', false);
    await criarLancamento(db, g, cen.adminA.id);
    expect((await cliente(cen.adminA.cookie).delete(url(ana, '2026-10'))).status).toBe(204);
    expect(await lancamentosDe(db, g)).toHaveLength(1);
    await expect(marcar(ana, '2026-10', true)).resolves.toBeDefined();
  });

  it('sem marcação: 404; a marcação do mesmo jogador em outro mês fica', async () => {
    const { db, cen, g, ana, marcar, url } = await cenario();
    await marcar(ana, '2026-09', false);
    expect((await cliente(cen.adminA.cookie).delete(url(ana, '2026-10'))).status).toBe(404);
    expect(await financeiro.pagamentosDoMes(db, g, '2026-09')).toHaveLength(1);
  });

  it('marcação do grupo B não é removida pelo A; uuid malformado: 404; mês inválido: 422', async () => {
    const { db, cen, g, url } = await cenario();
    const doB = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { apelido: 'Alheio', dataEntrada: '2026-01-01' });
    await emTransacao(db, (tx) =>
      financeiro.marcar(tx, cen.grupoB.id, {
        jogadorId: doB,
        mes: '2026-10',
        lancamento: null,
        autor: cen.adminB.id,
        agora: AGORA,
      }),
    );
    const c = cliente(cen.adminA.cookie);
    expect((await c.delete(url(doB, '2026-10'))).status).toBe(404);
    expect(await financeiro.pagamentosDoMes(db, cen.grupoB.id, '2026-10')).toHaveLength(1);
    expect((await c.delete(url('nao-e-uuid', '2026-10'))).status).toBe(404);
    const ruim = await c.delete(`/api/grupos/${g}/financeiro/pagamentos/${doB}/2026-13`);
    expect(ruim.status).toBe(422);
  });

  it('auditoria que lança desfaz tudo: marcação e lançamento continuam', async () => {
    const { db, cen, g, ana, marcar } = await cenario();
    await marcar(ana, '2026-10', true);
    vi.mocked(auditoria.registrar).mockRejectedValueOnce(new Error('falha'));
    await expect(
      desmarcarPagamento(db, g, { jogadorId: ana, mes: '2026-10' }, { autorContaId: cen.adminA.id, agora: AGORA }),
    ).rejects.toThrow('falha');
    expect(await financeiro.pagamentosDoMes(db, g, '2026-10')).toHaveLength(1);
    expect(await lancamentosDe(db, g)).toHaveLength(1);
  });

  it('sem X-Pelada 403; sem permissão do financeiro 403; outro grupo 404; sem sessão 401', async () => {
    const { cen, ana, marcar, url } = await cenario();
    await marcar(ana, '2026-10', false);
    expect((await cliente(cen.adminA.cookie, true).delete(url(ana, '2026-10'))).status).toBe(403);
    expect((await cliente(cen.adminASemFinanceiro.cookie).delete(url(ana, '2026-10'))).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).delete(url(ana, '2026-10'))).status).toBe(404);
    expect((await cliente().delete(url(ana, '2026-10'))).status).toBe(401);
  });
});
