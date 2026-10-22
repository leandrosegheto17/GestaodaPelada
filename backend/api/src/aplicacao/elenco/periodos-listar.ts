import type { PeriodosResposta } from '@pelada/contrato';
import { descreverPeriodos } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';

/** Períodos do jogador em ordem cronológica, com o que cada um permite corrigir. `null` se não é do grupo. */
export async function listarPeriodos(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
): Promise<PeriodosResposta | null> {
  const jogador = await jogadores.buscar(ex, grupoId, jogadorId);
  if (!jogador) return null;
  return {
    periodos: descreverPeriodos(jogador.periodos).map(({ id, tipo, inicio, fim, corrigivel }) => ({
      id,
      tipo,
      inicio,
      fim,
      corrigivel,
    })),
  };
}
