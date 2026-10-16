import type { Periodo } from '../atividade/atividade.js';
import { situacaoNaRodada } from '../atividade/situacao-rodada.js';
import type { Data } from '../datas/datas.js';
import type { ResolvedorDePesos } from '../pontuacao/pesos.js';
import { pontosDaPresenca } from '../pontuacao/pontos.js';
import type { SituacaoPresenca } from '../pontuacao/tipos.js';

export type SituacaoRodada = SituacaoPresenca | 'falta' | 'fora';

export interface Rodada {
  situacao: SituacaoRodada;
  /** Nulo quando o jogador estava fora do grupo na data ("–"). */
  pontos: number | null;
}

export interface PartidaDaRodada {
  id: string;
  data: Data;
  choveu: boolean;
}

/**
 * Uma rodada por partida, na ordem recebida: a situação do jogador (presença marcada, falta ou fora do
 * grupo na data) e os pontos pelos pesos vigentes na data da partida. Fora do grupo não pontua (`null`);
 * falta vale 0. É a mesma conta do ranking e do PDF.
 */
export function rodadasDoJogador(
  periodos: readonly Periodo[],
  partidas: readonly PartidaDaRodada[],
  situacaoPorPartida: ReadonlyMap<string, SituacaoPresenca>,
  resolverPesos: ResolvedorDePesos,
): Rodada[] {
  return partidas.map((partida): Rodada => {
    const situacao = situacaoNaRodada<SituacaoPresenca>(periodos, partida.data, situacaoPorPartida.get(partida.id));
    if (situacao === 'fora') return { situacao, pontos: null };
    if (situacao === 'falta') return { situacao, pontos: 0 };
    return { situacao, pontos: pontosDaPresenca(situacao, partida.choveu, resolverPesos(partida.data)) };
  });
}
