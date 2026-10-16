import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { criarDb, fecharDb, type Db } from '../../src/infraestrutura/db/index.js';
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
