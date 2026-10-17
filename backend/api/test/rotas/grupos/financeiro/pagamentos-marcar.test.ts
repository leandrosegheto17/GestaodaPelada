import { erroPadrao } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as financeiro from '../../../../src/infraestrutura/db/repositorios/financeiro.js';
import * as jogadores from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarConfig } from '../../../apoio/fabricas/financeiro.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

/** `comMensalidade`: true (padrão) grava 7500, false grava config sem mensalidade, `null` não grava config. */
async function cenario(comMensalidade: boolean | null = true) {
  const db = await abrir();
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  if (comMensalidade !== null) await criarConfig(db, g, { mensalidadeCentavos: comMensalidade ? 7_500 : null });
  const ana = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', dataEntrada: '2026-01-01' });
  return { db, cen, g, ana, url: `/api/grupos/${g}/financeiro/pagamentos` };
}

const lancamentosDe = (db: Awaited<ReturnType<typeof abrir>>, g: string) =>
  financeiro.lancamentosDoMes(db, g, '2026-10-01', '2026-10-31');

describe('POST /api/grupos/:g/financeiro/pagamentos (workerd)', () => {
  it('com mensalidade: marca, cria a entrada vinculada e audita', async () => {
    const { db, cen, g, ana, url } = await cenario();
    const r = await cliente(cen.adminA.cookie).post(url, { jogadorId: ana, mes: '2026-10' });
    expect(r.status).toBe(204);
    expect(await financeiro.pagamentosDoMes(db, g, '2026-10')).toHaveLength(1);
    expect(await lancamentosDe(db, g)).toMatchObject([
      { tipo: 'entrada', descricao: 'Mensalidade Ana 10/2026', valorCentavos: 7_500, mensalidade: true },
    ]);
    const auditoria = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'resumo'])
      .where('grupo_id', '=', g)
      .execute();
    expect(auditoria).toEqual([{ acao: 'pagamento_marcado', resumo: { mes: '2026-10', valorCentavos: 7_500 } }]);
  });

  it('sem mensalidade: só a marcação, nenhum lançamento', async () => {
    const { db, cen, g, ana, url } = await cenario(false);
    expect((await cliente(cen.adminA.cookie).post(url, { jogadorId: ana, mes: '2026-10' })).status).toBe(204);
    expect(await lancamentosDe(db, g)).toEqual([]);
  });

  it('sem configuração financeira: só a marcação, nenhum lançamento', async () => {
    const { db, cen, g, ana, url } = await cenario(null);
    expect((await cliente(cen.adminA.cookie).post(url, { jogadorId: ana, mes: '2026-10' })).status).toBe(204);
    expect(await lancamentosDe(db, g)).toEqual([]);
  });

  it('o mesmo jogador e mês de novo: 409 e nada novo gravado; outro mês é aceito', async () => {
    const { db, cen, g, ana, url } = await cenario();
    const c = cliente(cen.adminA.cookie);
    await c.post(url, { jogadorId: ana, mes: '2026-10' });
    const repetido = await c.post(url, { jogadorId: ana, mes: '2026-10' });
    expect(repetido.status).toBe(409);
    expect(erroPadrao.parse(repetido.corpo).erro.codigo).toBe('pagamento_ja_marcado');
    expect(await lancamentosDe(db, g)).toHaveLength(1);
    expect((await c.post(url, { jogadorId: ana, mes: '2026-09' })).status).toBe(204);
  });

  it('duas requisições simultâneas: uma passa e a outra dá 409', async () => {
    const { db, cen, g, ana, url } = await cenario();
    const c = cliente(cen.adminA.cookie);
    const [a, b] = await Promise.all([
      c.post(url, { jogadorId: ana, mes: '2026-10' }),
      c.post(url, { jogadorId: ana, mes: '2026-10' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([204, 409]);
    expect(await lancamentosDe(db, g)).toHaveLength(1);
  });

  it('jogador de outro grupo, inativo no mês, uuid malformado, mês futuro e campo extra: 422 sem gravar', async () => {
    const { db, cen, g, ana, url } = await cenario();
    const doB = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { apelido: 'Alheio' });
    const saiu = await criarJogador(db, g, cen.adminA.id, { apelido: 'Saiu', dataEntrada: '2026-01-01' });
    await jogadores.inativar(db, g, saiu, '2026-09-10');
    const c = cliente(cen.adminA.cookie);
    for (const corpo of [
      { jogadorId: doB, mes: '2026-10' },
      { jogadorId: saiu, mes: '2026-10' },
      { jogadorId: 'nao-e-uuid', mes: '2026-10' },
      { jogadorId: ana, mes: '2026-11' },
      { jogadorId: ana, mes: '2026-13' },
      { jogadorId: ana, mes: '2026-10', valorCentavos: 1 },
    ]) {
      expect((await c.post(url, corpo)).status, JSON.stringify(corpo)).toBe(422);
    }
    expect(await financeiro.pagamentosDoMes(db, g, '2026-10')).toEqual([]);
    expect(await financeiro.pagamentosDoMes(db, cen.grupoB.id, '2026-10')).toEqual([]);
  });

  it('sem X-Pelada 403; sem permissão do financeiro 403; outro grupo 404; sem sessão 401', async () => {
    const { cen, ana, url } = await cenario();
    const corpo = { jogadorId: ana, mes: '2026-10' };
    expect((await cliente(cen.adminA.cookie, true).post(url, corpo)).status).toBe(403);
    expect((await cliente(cen.adminASemFinanceiro.cookie).post(url, corpo)).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).post(url, corpo)).status).toBe(404);
    expect((await cliente().post(url, corpo)).status).toBe(401);
  });
});
