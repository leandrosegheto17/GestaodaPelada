import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

/** Registra o pedido ou, se já há um pendente da conta, só atualiza o momento (sem corrida). */
export async function registrarOuAtualizar(ex: ExecutorDb, contaId: string, agora: Date): Promise<void> {
  await sql`
    INSERT INTO pedidos_reset (conta_id, ultimo_pedido_em) VALUES (${contaId}, ${agora})
    ON CONFLICT (conta_id) WHERE resolvido_em IS NULL
    DO UPDATE SET ultimo_pedido_em = EXCLUDED.ultimo_pedido_em
  `.execute(kyselyDe(ex));
}

export interface PedidoPendente {
  id: string;
  contaId: string;
  email: string;
  /** Nomes dos grupos do admin, em ordem alfabética. */
  grupos: string[];
  ultimoPedidoEm: Date;
}

/**
 * Pendentes do mais recente para o mais antigo, numa só consulta. Devolve e-mail: só a rota do
 * dono (sob `/api/dono`) pode chamá-la.
 */
export async function listarPendentes(ex: ExecutorDb): Promise<PedidoPendente[]> {
  const resultado = await sql<{
    id: string;
    conta_id: string;
    email: string;
    grupos: string[];
    ultimo_pedido_em: Date;
  }>`
    SELECT p.id, p.conta_id, c.email, p.ultimo_pedido_em,
           coalesce(array_agg(g.nome ORDER BY g.nome) FILTER (WHERE g.id IS NOT NULL), '{}') AS grupos
    FROM pedidos_reset p
    JOIN contas c ON c.id = p.conta_id
    LEFT JOIN vinculos_admin v ON v.conta_id = p.conta_id
    LEFT JOIN grupos g ON g.id = v.grupo_id
    WHERE p.resolvido_em IS NULL
    GROUP BY p.id, c.email
    ORDER BY p.ultimo_pedido_em DESC
  `.execute(kyselyDe(ex));
  return resultado.rows.map((l) => ({
    id: l.id,
    contaId: l.conta_id,
    email: l.email,
    grupos: l.grupos,
    ultimoPedidoEm: l.ultimo_pedido_em,
  }));
}

interface Resolucao {
  /** Nulo quando quem resolve é a infraestrutura (script do dono). */
  resolvidoPor: string | null;
  agora: Date;
}

export async function resolverPorId(ex: ExecutorDb, pedidoId: string, r: Resolucao): Promise<boolean> {
  const res = await kyselyDe(ex)
    .updateTable('pedidos_reset')
    .set({ resolvido_em: r.agora, resolvido_por: r.resolvidoPor })
    .where('id', '=', pedidoId)
    .where('resolvido_em', 'is', null)
    .executeTakeFirst();
  return Number(res.numUpdatedRows) > 0;
}

export async function resolverPorConta(ex: ExecutorDb, contaId: string, r: Resolucao): Promise<boolean> {
  const res = await kyselyDe(ex)
    .updateTable('pedidos_reset')
    .set({ resolvido_em: r.agora, resolvido_por: r.resolvidoPor })
    .where('conta_id', '=', contaId)
    .where('resolvido_em', 'is', null)
    .executeTakeFirst();
  return Number(res.numUpdatedRows) > 0;
}
