import { describe, expect, it, vi } from 'vitest';
import { excluirLancamento } from '../../../../src/aplicacao/financeiro/lancamentos/excluir.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { emTransacao } from '../../../../src/infraestrutura/db/index.js';
import * as auditoria from '../../../../src/infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../../../src/infraestrutura/db/repositorios/financeiro.js';
import { usarDb } from '../../../apoio/db-teste.js';
import { criarConta } from '../../../apoio/fabricas/contas.js';
import { criarLancamento } from '../../../apoio/fabricas/financeiro.js';
import { criarGrupo, vincularAdmin } from '../../../apoio/fabricas/grupos.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const agora = new Date(relogioFixo('2026-10-22').agoraIso());

async function cenario() {
  const db = await abrir();
  const admin = await criarConta(db, fabrica);
  const grupo = await criarGrupo(db, fabrica, { criadoPor: admin.id });
  await vincularAdmin(db, grupo.id, admin.id, { acessaFinanceiro: true });
  const ctx = { autorContaId: admin.id, agora };
  const existe = async (id: string) => (await financeiro.buscarLancamento(db, grupo.id, id)) !== null;
  const acoes = async () =>
    (await kyselyDe(db).selectFrom('auditoria').select('acao').where('grupo_id', '=', grupo.id).execute()).map(
      (a) => a.acao,
    );
  const vinculado = async () => {
    const ana = await criarJogador(db, grupo.id, admin.id, { apelido: 'Ana', dataEntrada: '2026-01-01' });
    const r = await emTransacao(db, (tx) =>
      financeiro.marcar(tx, grupo.id, {
        jogadorId: ana,
        mes: '2026-10',
        lancamento: { data: '2026-10-02', descricao: 'Mensalidade Ana 10/2026', valorCentavos: 7_500 },
        autor: admin.id,
        agora,
      }),
    );
    return r.lancamentoId as string;
  };
  return { db, admin, grupo, ctx, existe, acoes, vinculado };
}

describe('excluirLancamento', () => {
  it('comum: apaga e grava uma auditoria sem a descrição', async () => {
    const { db, admin, grupo, ctx, existe } = await cenario();
    const id = await criarLancamento(db, grupo.id, admin.id, { descricao: 'Segredo' });
    expect(await excluirLancamento(db, grupo.id, id, ctx)).toEqual({ tipo: 'ok' });
    expect(await existe(id)).toBe(false);
    const linhas = await kyselyDe(db).selectFrom('auditoria').selectAll().where('grupo_id', '=', grupo.id).execute();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ acao: 'lancamento_excluido', entidade: 'lancamento', autor_conta_id: admin.id });
    expect(Object.keys(linhas[0]!.resumo as object).sort()).toEqual(['data', 'tipo', 'valorCentavos']);
  });

  it('vinculado a pagamento: vinculado, nada apagado e sem auditoria', async () => {
    const { db, grupo, ctx, existe, acoes, vinculado } = await cenario();
    const id = await vinculado();
    expect(await excluirLancamento(db, grupo.id, id, ctx)).toEqual({
      tipo: 'vinculado',
      mensagem: 'Esta entrada é a mensalidade de Ana 10/2026. Desmarque o pagamento no mês para removê-la.',
    });
    expect(await existe(id)).toBe(true);
    expect(await financeiro.pagamentosDoMes(db, grupo.id, '2026-10')).toHaveLength(1);
    expect(await acoes()).toEqual([]);
  });

  it('vinculado sem pagamento encontrado: mensagem genérica "um jogador"', async () => {
    const { db, grupo, ctx, vinculado } = await cenario();
    const id = await vinculado();
    const espiao = vi.spyOn(financeiro, 'pagamentoDoLancamento').mockResolvedValueOnce(null);
    const r = await excluirLancamento(db, grupo.id, id, ctx);
    espiao.mockRestore();
    expect(r).toEqual({
      tipo: 'vinculado',
      mensagem: 'Esta entrada é a mensalidade de um jogador. Desmarque o pagamento no mês para removê-la.',
    });
  });

  it('inexistente e segunda exclusão: nao_encontrado', async () => {
    const { db, admin, grupo, ctx } = await cenario();
    const id = await criarLancamento(db, grupo.id, admin.id);
    expect(await excluirLancamento(db, grupo.id, id, ctx)).toEqual({ tipo: 'ok' });
    expect(await excluirLancamento(db, grupo.id, id, ctx)).toEqual({ tipo: 'nao_encontrado' });
  });

  it('corrida: pagamento marcado após a checagem cai na FK e vira vinculado, sem apagar', async () => {
    const { db, grupo, ctx, existe, acoes, vinculado } = await cenario();
    const id = await vinculado();
    const real = financeiro.buscarLancamento;
    const espiao = vi
      .spyOn(financeiro, 'buscarLancamento')
      .mockImplementationOnce(async (...args) => ({ ...(await real(...args))!, mensalidade: false }));
    expect(await excluirLancamento(db, grupo.id, id, ctx)).toMatchObject({
      tipo: 'vinculado',
      mensagem: expect.stringContaining('mensalidade de Ana 10/2026'),
    });
    espiao.mockRestore();
    expect(await existe(id)).toBe(true);
    expect(await financeiro.pagamentosDoMes(db, grupo.id, '2026-10')).toHaveLength(1);
    expect(await acoes()).toEqual([]);
  });

  it('falha na auditoria desfaz a exclusão', async () => {
    const { db, admin, grupo, ctx, existe } = await cenario();
    const id = await criarLancamento(db, grupo.id, admin.id);
    const espiao = vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));
    await expect(excluirLancamento(db, grupo.id, id, ctx)).rejects.toThrow('auditoria fora');
    espiao.mockRestore();
    expect(await existe(id)).toBe(true);
  });
});
