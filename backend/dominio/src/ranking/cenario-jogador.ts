import { ativosEm } from '../atividade/atividade.js';
import { mesDe, type Data } from '../datas/datas.js';
import { acumuladoPorInicio, inicioDoPeriodo } from '../pontuacao/acumulado-inicio.js';
import { criarResolvedorDePesos } from '../pontuacao/pesos.js';
import type { ConfigPesos } from '../pontuacao/tipos.js';
import { ordenarPorRanking } from './ordem.js';
import {
  acumuladosDosAtivos,
  agruparPresencasPorJogador,
  periodoDoMes,
  type JogadorDoRanking,
  type PartidaDoRanking,
  type PresencaDoRanking,
} from './ranking.js';
import { type Rodada, rodadasDoJogador } from './rodadas.js';

export interface EntradaCenarios {
  hoje: Data;
  jogadorId: string;
  /** O jogador como está gravado. */
  alvoAntes: JogadorDoRanking;
  /** O mesmo jogador com a correção aplicada. */
  alvoDepois: JogadorDoRanking;
  jogadores: readonly JogadorDoRanking[];
  partidas: readonly PartidaDoRanking[];
  presencas: readonly PresencaDoRanking[];
  configsPesos: readonly ConfigPesos[];
}

export interface ComparacaoDeCenarios {
  acumuladoAntes: number;
  acumuladoDepois: number;
  /** Colocação no ranking de hoje; nula quando o jogador não está ativo hoje naquele cenário. */
  posicaoAntes: number | null;
  posicaoDepois: number | null;
  /** Uma rodada por partida, na ordem de `partidas`. */
  rodadasAntes: Rodada[];
  rodadasDepois: Rodada[];
}

/**
 * Acumulado, posição de hoje e rodadas de um jogador em dois cenários (como está × com a correção),
 * sem gravar. Os demais jogadores ficam como estão; o acumulado vem só de `acumuladoPorInicio`.
 */
export function compararCenarios(entrada: EntradaCenarios): ComparacaoDeCenarios {
  const { hoje, jogadorId } = entrada;
  const resolver = criarResolvedorDePesos(entrada.configsPesos);
  const presencasPorJogador = agruparPresencasPorJogador(entrada.partidas, entrada.presencas);
  const presencasDoAlvo = presencasPorJogador.get(jogadorId) ?? [];
  const situacoes = new Map(presencasDoAlvo.map((p) => [p.partidaId, p.situacao]));
  const outros = entrada.jogadores.filter((j) => j.id !== jogadorId);

  const cenario = (jogador: JogadorDoRanking) => {
    const ativos = ativosEm([...outros, jogador], hoje);
    const acumulados = acumuladosDosAtivos(ativos, presencasPorJogador, resolver, hoje);
    const posicao = ordenarPorRanking(ativos, acumulados).find((c) => c.jogador.id === jogadorId)?.posicao ?? null;
    const acumulado = acumuladoPorInicio({
      inicio: jogador.inicioPontuacao,
      pontuacaoInicial: jogador.pontuacaoInicial,
      presencas: presencasDoAlvo,
      configs: resolver,
      referencia: hoje,
      periodos: jogador.periodos,
    });
    // Cada rodada é cortada no início do período do mês dela, como no ranking e no PDF.
    const rodadas = entrada.partidas.map((partida) => {
      const inicio =
        jogador.inicioPontuacao === undefined
          ? undefined
          : inicioDoPeriodo(jogador.inicioPontuacao, jogador.periodos, periodoDoMes(hoje, mesDe(partida.data)));
      return rodadasDoJogador(jogador.periodos, [partida], situacoes, resolver, inicio)[0]!;
    });
    return { acumulado, posicao, rodadas };
  };
  const antes = cenario(entrada.alvoAntes);
  const depois = cenario(entrada.alvoDepois);
  return {
    acumuladoAntes: antes.acumulado,
    acumuladoDepois: depois.acumulado,
    posicaoAntes: antes.posicao,
    posicaoDepois: depois.posicao,
    rodadasAntes: antes.rodadas,
    rodadasDepois: depois.rodadas,
  };
}
