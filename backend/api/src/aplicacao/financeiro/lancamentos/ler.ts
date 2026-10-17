import type { Lancamento } from '@pelada/contrato';
import type { ExecutorDb } from '../../../infraestrutura/db/index.js';
import * as financeiro from '../../../infraestrutura/db/repositorios/financeiro.js';
import { paraLancamento } from './forma.js';

/** O lançamento do grupo na forma do contrato, ou `null` (inexistente e de outro grupo são o mesmo caso). */
export async function lerLancamento(ex: ExecutorDb, grupoId: string, id: string): Promise<Lancamento | null> {
  const l = await financeiro.buscarLancamento(ex, grupoId, id);
  return l ? paraLancamento(l) : null;
}
