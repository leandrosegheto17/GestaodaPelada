import { compararDatas, type Data } from '../datas/datas.js';
import type { ConfigPesos } from '../pontuacao/tipos.js';
import { compararCenarios } from './cenario-jogador.js';
import type { JogadorDoRanking, PartidaDoRanking, PresencaDoRanking } from './ranking.js';

export interface EntradaPreviaInicio {
  hoje: Data;
  jogadorId: string;
  novoInicio: Data;
  jogadores: readonly JogadorDoRanking[];
  partidas: readonly PartidaDoRanking[];
  presencas: readonly PresencaDoRanking[];
  configsPesos: readonly ConfigPesos[];
}

export interface PreviaInicio {
  acumuladoAntes: number;
  acumuladoDepois: number;
  /** Colocação no ranking de hoje; nula quando o jogador não está ativo hoje. */
  posicaoAntes: number | null;
  posicaoDepois: number | null;
  /** Rodadas que eram "–" e passam a ter situação (falta ou presença). */
  rodadasQuePassamAConstar: number;
}

/**
 * Efeito de trocar a data de início de um jogador, sem gravar: acumulado e posição de hoje antes e
 * depois, e quantas rodadas deixam de ser "–". Recuar antes do início do primeiro período alinha esse
 * início à nova data, como na gravação. O `inicioPontuacao` do jogador é a data atual.
 */
export function previaDoInicio(entrada: EntradaPreviaInicio): PreviaInicio {
  const { hoje, jogadorId, novoInicio } = entrada;
  const alvo = entrada.jogadores.find((j) => j.id === jogadorId);
  if (!alvo) throw new Error('Jogador desconhecido.');

  const depois: JogadorDoRanking = {
    ...alvo,
    inicioPontuacao: novoInicio,
    periodos: alvo.periodos.map((p, i) =>
      i === 0 && compararDatas(novoInicio, p.inicio) < 0 ? { ...p, inicio: novoInicio } : p,
    ),
  };
  const c = compararCenarios({ ...entrada, hoje, alvoAntes: alvo, alvoDepois: depois });
  return {
    acumuladoAntes: c.acumuladoAntes,
    acumuladoDepois: c.acumuladoDepois,
    posicaoAntes: c.posicaoAntes,
    posicaoDepois: c.posicaoDepois,
    rodadasQuePassamAConstar: c.rodadasDepois.filter(
      (r, i) => r.situacao !== 'fora' && c.rodadasAntes[i]?.situacao === 'fora',
    ).length,
  };
}
