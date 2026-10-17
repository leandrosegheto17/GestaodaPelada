import { somarDias, type Data } from '../datas/datas.js';
import { criarResolvedorDePesos } from '../pontuacao/pesos.js';
import { acumuladoAte } from '../pontuacao/pontos.js';
import type { ConfigPesos } from '../pontuacao/tipos.js';
import {
  agruparPresencasPorJogador,
  type JogadorDoRanking,
  type PartidaDoRanking,
  type PresencaDoRanking,
} from '../ranking/ranking.js';
import { ordenarPorRanking } from '../ranking/ordem.js';

export interface EntradaPrioridade {
  dataPartida: Data;
  /** Ids dos aptos da partida. */
  aptos: readonly string[];
  jogadores: readonly JogadorDoRanking[];
  partidas: readonly PartidaDoRanking[];
  presencas: readonly PresencaDoRanking[];
  configsPesos: readonly ConfigPesos[];
}

/**
 * Ordem de prioridade dos aptos (RN-08): a do ranking (RN-05) com referência na véspera da partida,
 * só com partidas anteriores. Sem partidas, o acumulado é 0 para todos e valem os desempates.
 */
export function ordenarPrioridade(entrada: EntradaPrioridade): string[] {
  const referencia = somarDias(entrada.dataPartida, -1);
  const resolver = criarResolvedorDePesos(entrada.configsPesos);
  const porId = new Map(entrada.jogadores.map((j) => [j.id, j]));
  const presencasPorJogador = agruparPresencasPorJogador(entrada.partidas, entrada.presencas);

  const aptos = [...entrada.aptos].sort().map((id) => {
    const jogador = porId.get(id);
    if (!jogador) throw new Error(`apto sem cadastro: ${id}`);
    return jogador;
  });
  const acumulados = new Map(
    aptos.map((j) => [j.id, acumuladoAte(presencasPorJogador.get(j.id) ?? [], resolver, referencia)]),
  );
  return ordenarPorRanking(aptos, acumulados).map(({ jogador }) => jogador.id);
}
