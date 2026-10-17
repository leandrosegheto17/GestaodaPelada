import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { sql } from 'kysely';
import { criarDb, fecharDb, type Db } from '../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import type { Fabrica } from './fabrica.js';

/**
 * Conexão do banco de teste dentro do workerd (pelo binding do Hyperdrive), para criar dados
 * pelos repositórios. O fechamento é registrado primeiro na fábrica e roda por último.
 */
export function usarDbDoWorker(fabrica: Fabrica) {
  return async (): Promise<Db> => {
    const ctx = createExecutionContext();
    const db = criarDb(env.HYPERDRIVE, ctx);
    fabrica.registrar(async () => {
      await fecharDb(db);
      await waitOnExecutionContext(ctx);
    });
    return db;
  };
}

/** Linhas de cada tabela do schema `public` (conexão própria, fechada ao fim), para conferir que a suíte limpou o que criou. */
export async function contarLinhasPorTabela(): Promise<Record<string, number>> {
  const ctx = createExecutionContext();
  const db = criarDb(env.HYPERDRIVE, ctx);
  try {
    const banco = kyselyDe(db);
    const tabelas = await sql<{ table_name: string }>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`.execute(banco);
    const contagem: Record<string, number> = {};
    for (const { table_name: nome } of tabelas.rows) {
      const r = await sql<{ n: string }>`SELECT count(*) AS n FROM ${sql.table(nome)}`.execute(banco);
      contagem[nome] = Number(r.rows[0]?.n);
    }
    return contagem;
  } finally {
    await fecharDb(db);
    await waitOnExecutionContext(ctx);
  }
}
