import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';

/** Altera nome, dia, frequência e horário. O slug (link público) nunca muda. */
export function editarGrupo(
  ex: ExecutorDb,
  grupoId: string,
  dados: { nome: string; diaSemana: string; frequencia: string; horario: string },
): Promise<boolean> {
  return grupos.atualizarDados(ex, grupoId, dados);
}
