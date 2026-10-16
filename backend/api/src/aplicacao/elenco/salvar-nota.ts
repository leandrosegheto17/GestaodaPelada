import type { NotaSalva } from '@pelada/contrato';
import type { Db } from '../../infraestrutura/db/index.js';
import * as habilidades from '../../infraestrutura/db/repositorios/habilidades.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { nivelDaResposta } from './nivel.js';

/**
 * Grava (ou apaga, com `null`) a nota do jogador numa habilidade do grupo e devolve o nível recalculado.
 * `null` = jogador ou habilidade não são deste grupo. Apagar uma nota que não existe não é erro.
 * Jogador inativo também recebe nota: o cadastro de habilidades não depende da situação.
 */
export async function salvarNota(
  db: Db,
  grupoId: string,
  jogadorId: string,
  habilidadeId: string,
  nota: number | null,
): Promise<NotaSalva | null> {
  if (!(await jogadores.buscar(db, grupoId, jogadorId))) return null;
  const catalogo = await habilidades.notasDoJogador(db, grupoId, jogadorId);
  if (!catalogo.some((h) => h.habilidadeId === habilidadeId)) return null;

  if (nota === null) await habilidades.apagarNota(db, grupoId, jogadorId, habilidadeId);
  else if (!(await habilidades.gravarNota(db, grupoId, jogadorId, habilidadeId, nota))) return null;

  const notas = (await habilidades.notasDoJogador(db, grupoId, jogadorId)).flatMap((h) =>
    h.nota === null ? [] : [h.nota],
  );
  return { habilidadeId, nota, ...nivelDaResposta(notas) };
}
