import { describe, expect, it, vi } from 'vitest';
import { excluirJogador } from '../../../src/aplicacao/elenco/excluir.js';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as auditoria from '../../../src/infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarConta } from '../../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../../apoio/fabricas/grupos.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const agora = new Date(relogioFixo('2026-10-16').agoraIso());

async function cenario() {
  const db = await abrir();
  const admin = await criarConta(db, fabrica);
  const grupo = await criarGrupo(db, fabrica, { criadoPor: admin.id });
  await vincularAdmin(db, grupo.id, admin.id, { acessaFinanceiro: true });
  const jogadorId = await criarJogador(db, grupo.id, admin.id, { apelido: 'Zeca' });
  const ctx = { autorContaId: admin.id, agora };
  const existe = async () => (await jogadores.buscar(db, grupo.id, jogadorId)) !== null;
  const periodos = async () =>
    (await kyselyDe(db).selectFrom('periodos_ativos').select('id').where('jogador_id', '=', jogadorId).execute())
      .length;
  const acoes = async () =>
    (await kyselyDe(db).selectFrom('auditoria').select('acao').where('grupo_id', '=', grupo.id).execute()).map(
      (a) => a.acao,
    );
  const comPresenca = () =>
    emTransacao(db, (tx) =>
      partidas.criar(tx, grupo.id, {
        data: '2026-10-15',
        choveu: false,
        presencas: [{ jogadorId, situacao: 'presente' }],
        autor: admin.id,
        agora,
      }),
    );
  return { db, admin, grupo, jogadorId, ctx, existe, periodos, acoes, comPresenca };
}

describe('excluirJogador', () => {
  it('sem histórico apaga jogador e períodos e grava uma auditoria só com o apelido', async () => {
    const { db, admin, grupo, jogadorId, ctx, existe, periodos } = await cenario();
    expect(await excluirJogador(db, grupo.id, jogadorId, ctx)).toEqual({ tipo: 'ok' });
    expect(await existe()).toBe(false);
    expect(await periodos()).toBe(0);
    const linhas = await kyselyDe(db).selectFrom('auditoria').selectAll().where('grupo_id', '=', grupo.id).execute();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ acao: 'jogador_excluido', entidade: 'jogador', resumo: { apelido: 'Zeca' } });
    expect(JSON.stringify(linhas[0])).toContain(admin.id);
    expect(Object.keys(linhas[0]!.resumo as object)).toEqual(['apelido']);
  });

  it('com presença: com_historico, nada apagado e sem auditoria', async () => {
    const { db, grupo, jogadorId, ctx, existe, periodos, acoes, comPresenca } = await cenario();
    await comPresenca();
    expect(await excluirJogador(db, grupo.id, jogadorId, ctx)).toEqual({ tipo: 'com_historico', apelido: 'Zeca' });
    expect(await existe()).toBe(true);
    expect(await periodos()).toBe(1);
    expect(await acoes()).toEqual([]);
  });

  it('inexistente e segunda exclusão: nao_encontrado', async () => {
    const { db, grupo, jogadorId, ctx } = await cenario();
    expect(await excluirJogador(db, grupo.id, jogadorId, ctx)).toEqual({ tipo: 'ok' });
    expect(await excluirJogador(db, grupo.id, jogadorId, ctx)).toEqual({ tipo: 'nao_encontrado' });
  });

  it('corrida: presença gravada após a checagem cai na FK e vira com_historico, sem apagar', async () => {
    const { db, grupo, jogadorId, ctx, existe, periodos, acoes, comPresenca } = await cenario();
    await comPresenca();
    const espiao = vi.spyOn(jogadores, 'temHistorico').mockResolvedValueOnce(false);
    expect(await excluirJogador(db, grupo.id, jogadorId, ctx)).toEqual({ tipo: 'com_historico', apelido: 'Zeca' });
    espiao.mockRestore();
    expect(await existe()).toBe(true);
    expect(await periodos()).toBe(1);
    expect(await acoes()).toEqual([]);
  });

  it('falha na auditoria desfaz a exclusão', async () => {
    const { db, grupo, jogadorId, ctx, existe, periodos } = await cenario();
    const espiao = vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));
    await expect(excluirJogador(db, grupo.id, jogadorId, ctx)).rejects.toThrow('auditoria fora');
    espiao.mockRestore();
    expect(await existe()).toBe(true);
    expect(await periodos()).toBe(1);
  });
});
