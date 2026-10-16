import { usoPorSemana, type UsoPorSemana } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as eventos from '../../infraestrutura/db/repositorios/eventos.js';

/** Uso por semana (mais recentes primeiro): a agregação e a ordem são do repositório. */
export async function montarPainelUso(ex: ExecutorDb, grupoId: string): Promise<UsoPorSemana> {
  const semanas = await eventos.porSemana(ex, grupoId);
  return usoPorSemana.parse({
    semanas: semanas.map((s) => ({
      inicio: s.inicio,
      fim: s.fim,
      aparelhosRanking: s.aparelhosRanking,
      pdfsExportados: s.pdfsExportados,
      partidasLancadas: s.partidasLancadas,
      partidasEm48h: s.partidasEm48h,
      escalacoesConfirmadas: s.escalacoesConfirmadas,
    })),
  });
}
