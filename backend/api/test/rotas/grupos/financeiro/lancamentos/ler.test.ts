import { lancamento } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
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
const cliente = (cookie?: string) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), ...(cookie ? { cookie } : {}) });
const CHAVES = ['alteradoEm', 'alteradoPor', 'data', 'descricao', 'id', 'mensalidade', 'tipo', 'valorCentavos'];

describe('GET /api/grupos/:g/financeiro/lancamentos/:id (workerd)', () => {
  it('lançamento comum: as chaves do contrato, mensalidade falsa e o nome de quem alterou', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarLancamento(db, g, cen.adminA.id);
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/financeiro/lancamentos/${id}`);
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(Object.keys(r.corpo as object).sort()).toEqual(CHAVES);
    expect(lancamento.parse(r.corpo)).toMatchObject({
      id,
      mensalidade: false,
      alteradoPor: 'Admin A',
      valorCentavos: 80_000,
    });
    expect(r.texto).not.toContain(cen.adminA.id);
  });

  it('entrada vinculada a um pagamento: mensalidade verdadeira', async () => {
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
    const r = await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/financeiro/lancamentos/${lancamentoId}`);
    expect(lancamento.parse(r.corpo).mensalidade).toBe(true);
  });

  it('inexistente, de outro grupo e malformado: o mesmo 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const doB = await criarLancamento(db, cen.grupoB.id, cen.adminB.id);
    const c = cliente(cen.adminA.cookie);
    const inexistente = await c.get(`/api/grupos/${g}/financeiro/lancamentos/00000000-0000-4000-8000-000000000000`);
    const alheio = await c.get(`/api/grupos/${g}/financeiro/lancamentos/${doB}`);
    const malformado = await c.get(`/api/grupos/${g}/financeiro/lancamentos/nao-e-uuid`);
    expect([inexistente.status, alheio.status, malformado.status]).toEqual([404, 404, 404]);
    expect(alheio.corpo).toEqual(inexistente.corpo);
  });

  it('sem a permissão do financeiro 403; outro grupo 404; sem sessão 401', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarLancamento(db, g, cen.adminA.id);
    const url = `/api/grupos/${g}/financeiro/lancamentos/${id}`;
    expect((await cliente(cen.adminASemFinanceiro.cookie).get(url)).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).get(url)).status).toBe(404);
    expect((await cliente().get(url)).status).toBe(401);
  });
});
