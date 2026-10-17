import { kyselyDe, type ExecutorDb } from '../../../src/infraestrutura/db/cliente.js';
import * as eventos from '../../../src/infraestrutura/db/repositorios/eventos.js';
import type { Fabrica } from '../fabrica.js';

/** Registra um evento de uso e a limpeza dos eventos do grupo. */
export async function criarEvento(
  db: ExecutorDb,
  fabrica: Fabrica,
  grupoId: string,
  evento: eventos.EventoDeUso,
): Promise<void> {
  await eventos.registrar(db, grupoId, evento);
  fabrica.registrar(async () => {
    await kyselyDe(db).deleteFrom('eventos_uso').where('grupo_id', '=', grupoId).execute();
  });
}
