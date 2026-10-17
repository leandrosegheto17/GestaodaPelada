import { describe, expect, it, vi } from 'vitest';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import * as pedidos from '../../src/infraestrutura/db/repositorios/pedidos-reset.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../apoio/fabricas/grupos.js';
import { criarPedido } from '../apoio/fabricas/pedidos-reset.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const t0 = new Date(relogioFixo('2026-10-16', '10:00').agoraIso());
const t1 = new Date(t0.getTime() + 60 * 60 * 1000);

describe('repositório de pedidos de reset', () => {
  it('o segundo pedido da mesma conta só atualiza a data', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    await criarPedido(db, fabrica, conta.id, t0);
    await pedidos.registrarOuAtualizar(db, conta.id, t1);
    const linhas = await executarSql<{ ultimo_pedido_em: Date }>(
      'SELECT ultimo_pedido_em FROM pedidos_reset WHERE conta_id = $1 AND resolvido_em IS NULL',
      [conta.id],
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.ultimo_pedido_em).toEqual(t1);
  });

  it('lista com os grupos em ordem, conta sem vínculo e do mais recente ao mais antigo', async () => {
    const db = await abrir();
    const comGrupos = await criarConta(db, fabrica);
    const semGrupos = await criarConta(db, fabrica);
    const g2 = await criarGrupo(db, fabrica, { criadoPor: comGrupos.id, nome: 'Zebra FC' });
    const g1 = await criarGrupo(db, fabrica, { criadoPor: comGrupos.id, nome: 'Alfa FC' });
    await vincularAdmin(db, g1.id, comGrupos.id);
    await vincularAdmin(db, g2.id, comGrupos.id);
    await criarPedido(db, fabrica, comGrupos.id, t0);
    await criarPedido(db, fabrica, semGrupos.id, t1);
    const lista = (await pedidos.listarPendentes(db)).filter((p) => [comGrupos.id, semGrupos.id].includes(p.contaId));
    expect(lista.map((p) => p.contaId)).toEqual([semGrupos.id, comGrupos.id]);
    expect(lista[0]?.grupos).toEqual([]);
    expect(lista[1]?.grupos).toEqual(['Alfa FC', 'Zebra FC']);
  });

  it('resolver tira da lista, é idempotente e um novo pedido cria outra linha', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    await criarPedido(db, fabrica, conta.id, t0);
    const [pedido] = (await pedidos.listarPendentes(db)).filter((p) => p.contaId === conta.id);
    expect(await pedidos.resolverPorId(db, pedido?.id as string, { resolvidoPor: conta.id, agora: t1 })).toBe(true);
    expect(await pedidos.resolverPorId(db, pedido?.id as string, { resolvidoPor: conta.id, agora: t1 })).toBe(false);
    expect((await pedidos.listarPendentes(db)).some((p) => p.contaId === conta.id)).toBe(false);
    await pedidos.registrarOuAtualizar(db, conta.id, t1);
    expect(await pedidos.resolverPorConta(db, conta.id, { resolvidoPor: null, agora: t1 })).toBe(true);
    expect(await pedidos.resolverPorConta(db, conta.id, { resolvidoPor: null, agora: t1 })).toBe(false);
  });

  it('listarPendentes usa uma única consulta', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    await criarPedido(db, fabrica, conta.id, t0);
    const espiao = vi.spyOn(kyselyDe(db).getExecutor(), 'executeQuery');
    await pedidos.listarPendentes(db);
    expect(espiao).toHaveBeenCalledTimes(1);
    espiao.mockRestore();
  });
});
