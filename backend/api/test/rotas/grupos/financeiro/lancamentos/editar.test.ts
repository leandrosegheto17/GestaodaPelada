import { lancamento } from '@pelada/contrato';
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
  clienteTeste({ relogio: relogioFixo('2026-10-22', '18:40'), semCsrf, ...(cookie ? { cookie } : {}) });
const NOVO = { tipo: 'entrada', data: '2026-10-06', descricao: 'Patrocínio', valorCentavos: 12_300 };

describe('PUT /api/grupos/:g/financeiro/lancamentos/:id (workerd)', () => {
  it('edita todos os campos; alteradoPor e alteradoEm passam a ser os do editor; audita o valor antes e depois', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarLancamento(db, g, cen.adminA.id);
    const r = await cliente(cen.adminASemFinanceiro.cookie).put(`/api/grupos/${g}/financeiro/lancamentos/${id}`, NOVO);
    expect(r.status).toBe(403);
    const ok = await cliente(cen.adminA.cookie).put(`/api/grupos/${g}/financeiro/lancamentos/${id}`, NOVO);
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Cache-Control')).toBe('no-store');
    expect(lancamento.parse(ok.corpo)).toMatchObject({ ...NOVO, alteradoPor: 'Admin A', mensalidade: false });
    const auditoria = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'resumo'])
      .where('grupo_id', '=', g)
      .execute();
    expect(auditoria).toEqual([
      {
        acao: 'lancamento_editado',
        resumo: { valorAntes: 80_000, valorDepois: 12_300, tipo: 'entrada', data: '2026-10-06', mensalidade: false },
      },
    ]);
  });

  it('entrada vinculada: muda o valor e continua vinculada; trocar para saída é recusado', async () => {
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
    const url = `/api/grupos/${g}/financeiro/lancamentos/${lancamentoId}`;
    const novoValor = {
      tipo: 'entrada',
      data: '2026-10-02',
      descricao: 'Mensalidade Ana 10/2026',
      valorCentavos: 5_000,
    };
    const ok = await cliente(cen.adminA.cookie).put(url, novoValor);
    expect(lancamento.parse(ok.corpo)).toMatchObject({ valorCentavos: 5_000, mensalidade: true });
    expect(await financeiro.pagamentosDoMes(db, g, '2026-10')).toEqual([{ jogadorId: ana, lancamentoId }]);

    const saida = await cliente(cen.adminA.cookie).put(url, { ...novoValor, tipo: 'saida' });
    expect(saida.status).toBe(422);
    expect(Object.keys((saida.corpo as { erro: { campos: object } }).erro.campos)).toEqual(['tipo']);
    expect((await financeiro.buscarLancamento(db, g, lancamentoId as string))?.tipo).toBe('entrada');
  });

  it.each([
    ['descrição vazia', { descricao: '' }],
    ['descrição de 81 caracteres', { descricao: 'x'.repeat(81) }],
    ['valor 0', { valorCentavos: 0 }],
    ['valor decimal', { valorCentavos: 1.5 }],
    ['valor acima do limite', { valorCentavos: 100_000_000 }],
    ['data inválida', { data: '2026-02-30' }],
    ['campo extra', { grupoId: 'x' }],
  ])('%s → 422 e o lançamento não muda', async (_, parcial) => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarLancamento(db, g, cen.adminA.id);
    const r = await cliente(cen.adminA.cookie).put(`/api/grupos/${g}/financeiro/lancamentos/${id}`, {
      ...NOVO,
      ...parcial,
    });
    expect(r.status).toBe(422);
    expect((await financeiro.buscarLancamento(db, g, id))?.descricao).toBe('Aluguel da quadra');
  });

  it('inexistente, de outro grupo e malformado: 404; o lançamento de B fica intacto', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const doB = await criarLancamento(db, cen.grupoB.id, cen.adminB.id);
    const c = cliente(cen.adminA.cookie);
    expect((await c.put(`/api/grupos/${g}/financeiro/lancamentos/${doB}`, NOVO)).status).toBe(404);
    expect(
      (await c.put(`/api/grupos/${g}/financeiro/lancamentos/00000000-0000-4000-8000-000000000000`, NOVO)).status,
    ).toBe(404);
    expect((await c.put(`/api/grupos/${g}/financeiro/lancamentos/nao-e-uuid`, NOVO)).status).toBe(404);
    expect((await financeiro.buscarLancamento(db, cen.grupoB.id, doB))?.descricao).toBe('Aluguel da quadra');
  });

  it('sem X-Pelada 403; outro grupo 404; sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarLancamento(db, g, cen.adminA.id);
    const url = `/api/grupos/${g}/financeiro/lancamentos/${id}`;
    expect((await cliente(cen.adminA.cookie, true).put(url, NOVO)).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).put(url, NOVO)).status).toBe(404);
    expect((await cliente().put(url, NOVO)).status).toBe(401);
  });
});
