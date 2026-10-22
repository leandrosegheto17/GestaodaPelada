import type { Periodo } from '../atividade/atividade.js';
import type { Data } from '../datas/datas.js';
import type { ConfigPesos } from '../pontuacao/tipos.js';
import { compararCenarios } from './cenario-jogador.js';
import type { JogadorDoRanking, PartidaDoRanking, PresencaDoRanking } from './ranking.js';
import type { SituacaoRodada } from './rodadas.js';

export interface EntradaPreviaPeriodos {
  hoje: Data;
  jogadorId: string;
  /** Períodos depois da correção; o `inicioPontuacao` do jogador não muda. */
  periodosNovos: readonly Periodo[];
  jogadores: readonly JogadorDoRanking[];
  partidas: readonly PartidaDoRanking[];
  presencas: readonly PresencaDoRanking[];
  configsPesos: readonly ConfigPesos[];
}

export interface PreviaPeriodos {
  acumuladoAntes: number;
  acumuladoDepois: number;
  /** Colocação no ranking de hoje; nula quando o jogador não está ativo hoje naquele cenário. */
  posicaoAntes: number | null;
  posicaoDepois: number | null;
  /** Rodadas que eram "–" e passam a ter situação, com a situação nova. */
  rodadasQuePassamAConstar: { data: Data; situacao: Exclude<SituacaoRodada, 'fora'> }[];
  /** Rodadas que tinham situação e passam a ser "–". */
  rodadasQueDeixamDeConstar: { data: Data }[];
}

/** Efeito de corrigir os períodos de um jogador, sem gravar: acumulado e posição de hoje, e rodadas que passam a constar ou deixam de constar. */
export function previaDosPeriodos(entrada: EntradaPreviaPeriodos): PreviaPeriodos {
  const alvo = entrada.jogadores.find((j) => j.id === entrada.jogadorId);
  if (!alvo) throw new Error('Jogador desconhecido.');
  const { periodosNovos, ...resto } = entrada;
  const c = compararCenarios({ ...resto, alvoAntes: alvo, alvoDepois: { ...alvo, periodos: periodosNovos } });

  const passamAConstar: PreviaPeriodos['rodadasQuePassamAConstar'] = [];
  const deixamDeConstar: PreviaPeriodos['rodadasQueDeixamDeConstar'] = [];
  entrada.partidas.forEach((partida, i) => {
    const antes = c.rodadasAntes[i]?.situacao;
    const depois = c.rodadasDepois[i]?.situacao;
    if (depois === undefined || antes === undefined) return;
    if (antes === 'fora' && depois !== 'fora') passamAConstar.push({ data: partida.data, situacao: depois });
    else if (antes !== 'fora' && depois === 'fora') deixamDeConstar.push({ data: partida.data });
  });
  return {
    acumuladoAntes: c.acumuladoAntes,
    acumuladoDepois: c.acumuladoDepois,
    posicaoAntes: c.posicaoAntes,
    posicaoDepois: c.posicaoDepois,
    rodadasQuePassamAConstar: passamAConstar,
    rodadasQueDeixamDeConstar: deixamDeConstar,
  };
}
