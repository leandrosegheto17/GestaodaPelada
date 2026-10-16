import type { Data } from '../datas/datas.js';
import type { ConfigPesos } from '../pontuacao/tipos.js';
import type { JogadorDoRanking, PartidaDoRanking, PresencaDoRanking } from '../ranking/ranking.js';
import { avisosDois, avisosVarios, type AvisoSim } from './avisos.js';
import { classificarDoisTimes, type Limite } from './classificacao.js';
import { distribuirDoisTimes } from './distribuicao-dois.js';
import { distribuirVariosTimes, type DistribuicaoVarios } from './distribuicao-varios.js';
import { indicadoresDois, indicadoresVarios, type IndicadoresDois, type IndicadoresVarios } from './indicadores.js';
import { calcularPrevia, type FormatoEscalacao, type Previa } from './previa.js';
import { ordenarPrioridade } from './prioridade.js';
import type { ComposicaoDois, JogadorSim } from './tipos.js';

export interface HistoricoSim {
  jogadores: readonly JogadorDoRanking[];
  partidas: readonly PartidaDoRanking[];
  presencas: readonly PresencaDoRanking[];
  configsPesos: readonly ConfigPesos[];
}

export interface EntradaSugerir {
  formato: FormatoEscalacao;
  n: number;
  /** Só vale em "2 times". */
  k: Limite;
  dataPartida: Data;
  /** Aptos com nível e idade já calculados. */
  aptos: readonly JogadorSim[];
  historico: HistoricoSim;
}

export type SugestaoSim =
  | { valida: false; previa: Previa }
  | {
      valida: true;
      formato: 'dois_times';
      ordemPrioridade: string[];
      composicao: ComposicaoDois;
      indicadores: [IndicadoresDois, IndicadoresDois];
      avisos: AvisoSim[];
    }
  | {
      valida: true;
      formato: 'varios_times';
      composicao: DistribuicaoVarios;
      indicadores: IndicadoresVarios[];
      avisos: AvisoSim[];
    };

/**
 * Orquestra a sugestão: prévia → prioridade → classificação → distribuição → indicadores → avisos.
 * Em "3 ou mais times" não há prioridade (RF-41). A avaliação de uma composição editada usa as mesmas
 * funções de indicadores e avisos; `sugerir` não tem caminho próprio para isso.
 */
export function sugerir(entrada: EntradaSugerir): SugestaoSim {
  const { formato, n, k, dataPartida, aptos, historico } = entrada;
  const previa = calcularPrevia({ formato, n, aptos: aptos.length });
  if (!previa.valida) return { valida: false, previa };

  const jogadores = new Map(aptos.map((a) => [a.id, a]));

  if (formato === 'varios_times') {
    const composicao = distribuirVariosTimes({ n, jogadores: aptos });
    return {
      valida: true,
      formato,
      composicao,
      indicadores: indicadoresVarios(composicao, jogadores),
      avisos: avisosVarios({ n, comp: composicao, jogadores }),
    };
  }

  const ordemPrioridade = ordenarPrioridade({ dataPartida, aptos: aptos.map((a) => a.id), ...historico });
  const rank = new Map(ordemPrioridade.map((id, i) => [id, i]));
  const ordem = ordemPrioridade.map((id) => jogadores.get(id)!);
  const classificacao = classificarDoisTimes({ ordem, n, k });
  const composicao = distribuirDoisTimes({ classificacao, jogadores, rank });
  return {
    valida: true,
    formato,
    ordemPrioridade,
    composicao,
    indicadores: [
      indicadoresDois(composicao.times[0], jogadores, rank),
      indicadoresDois(composicao.times[1], jogadores, rank),
    ],
    avisos: avisosDois({ n, comp: composicao, jogadores, rank }),
  };
}
