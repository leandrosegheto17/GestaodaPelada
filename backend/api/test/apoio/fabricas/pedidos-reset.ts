import type { ExecutorDb } from '../../../src/infraestrutura/db/index.js';
import * as pedidos from '../../../src/infraestrutura/db/repositorios/pedidos-reset.js';
import type { Fabrica } from '../fabrica.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';

/** Registra um pedido de reset e a limpeza correspondente. */
export async function criarPedido(db: ExecutorDb, fabrica: Fabrica, contaId: string, agora: Date): Promise<void> {
  await pedidos.registrarOuAtualizar(db, contaId, agora);
  fabrica.registrar(async () => {
    await kyselyDe(db).deleteFrom('pedidos_reset').where('conta_id', '=', contaId).execute();
  });
}
