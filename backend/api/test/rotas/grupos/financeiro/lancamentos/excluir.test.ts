import { erroLancamentoVinculado } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../../src/infraestrutura/db/cliente.js';
import { emTransacao } from '../../../../../src/infraestrutura/db/index.js';
import * as financeiro from '../../../../../src/infraestrutura/db/repositorios/financeiro.js';
import { montarCenario } from '../../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../../apoio/db-worker.js';
import { criarLancamento } from '../../../../apoio/fabricas/financeiro.js';
import { criarJogador } from '../../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../../apoio/fabrica.js';
import { relogioFixo } from '../../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const AGORA = new Date('2026-10-22T15:00:00Z');
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

describe('DELETE /api/grupos/:g/financeiro/lancamentos/:id (workerd)', () => {
  it('lançamento comum: 204, some e a auditoria não leva a descrição', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarLancamento(db, g, cen.adminA.id, { descricao: 'Segredo no texto livre' });
    const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/financeiro/lancamentos/${id}`);
    expect(r.status).toBe(204);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(await financeiro.buscarLancamento(db, g, id)).toBeNull();
    const auditoria = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'autor_conta_id', 'resumo'])
      .where('grupo_id', '=', g)
      .execute();
    expect(auditoria).toEqual([
      {
        acao: 'lancamento_excluido',
        autor_conta_id: cen.adminA.id,
        resumo: { tipo: 'saida', data: '2026-10-05', valorCentavos: 80_000 },
      },
    ]);
  });

  it('entrada vinculada a pagamento: 409 orientando desmarcar; lançamento, pagamento e auditoria intactos', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const ana = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: '2026-01-01' });
    const { lancamentoId } = await emTransacao(db, (tx) =>
      financeiro.marcar(tx, g, {
        jogadorId: ana,
        mes: '2026-10',
        lancamento: { data: '2026-10-02', descricao: 'Mensalidade Ana 10/2026', valorCentavos: 7_500 },
        autor: cen.adminA.id,
        agora: AGORA,
      }),
    );
    const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/financeiro/lancamentos/${lancamentoId}`);
    expect(r.status).toBe(409);
    expect(erroLancamentoVinculado.safeParse(r.corpo).success).toBe(true);
    expect(r.texto).toContain(
      'Esta entrada é a mensalidade de Ana 10/2026. Desmarque o pagamento no mês para removê-la.',
    );
    expect(await financeiro.buscarLancamento(db, g, lancamentoId as string)).not.toBeNull();
    expect(await financeiro.pagamentosDoMes(db, g, '2026-10')).toHaveLength(1);
    expect(await kyselyDe(db).selectFrom('auditoria').select('id').where('grupo_id', '=', g).execute()).toEqual([]);
  });

  it('segunda exclusão, inexistente, de outro grupo e malformado: 404; o lançamento de B fica intacto', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarLancamento(db, g, cen.adminA.id);
    const doB = await criarLancamento(db, cen.grupoB.id, cen.adminB.id);
    const c = cliente(cen.adminA.cookie);
    expect((await c.delete(`/api/grupos/${g}/financeiro/lancamentos/${id}`)).status).toBe(204);
    expect((await c.delete(`/api/grupos/${g}/financeiro/lancamentos/${id}`)).status).toBe(404);
    expect((await c.delete(`/api/grupos/${g}/financeiro/lancamentos/${doB}`)).status).toBe(404);
    expect((await c.delete(`/api/grupos/${g}/financeiro/lancamentos/nao-e-uuid`)).status).toBe(404);
    expect(await financeiro.buscarLancamento(db, cen.grupoB.id, doB)).not.toBeNull();
  });

  it('sem X-Pelada 403; sem a permissão do financeiro 403; outro grupo 404; sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarLancamento(db, g, cen.adminA.id);
    const url = `/api/grupos/${g}/financeiro/lancamentos/${id}`;
    expect((await cliente(cen.adminA.cookie, true).delete(url)).status).toBe(403);
    expect((await cliente(cen.adminASemFinanceiro.cookie).delete(url)).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).delete(url)).status).toBe(404);
    expect((await cliente().delete(url)).status).toBe(401);
    expect(await financeiro.buscarLancamento(db, g, id)).not.toBeNull();
  });
});
