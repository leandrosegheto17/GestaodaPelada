import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import { marcarAvisoVisto } from '../../infraestrutura/db/repositorios/contas.js';

/** Registra que a conta viu o aviso de privacidade. Idempotente: o primeiro instante é mantido (RF-64). */
export async function marcarAvisoPrivacidadeVisto(db: ExecutorDb, contaId: string, agora: Date): Promise<void> {
  await marcarAvisoVisto(db, contaId, agora);
}
