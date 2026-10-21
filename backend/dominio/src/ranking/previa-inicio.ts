import { ativosEm } from '../atividade/atividade.js';
import { compararDatas, type Data } from '../datas/datas.js';
import { acumuladoPorInicio } from '../pontuacao/acumulado-inicio.js';
import { criarResolvedorDePesos } from '../pontuacao/pesos.js';
import type { ConfigPesos } from '../pontuacao/tipos.js';
import { ordenarPorRanking } from './ordem.js';
import {
  acumuladosDosAtivos,
  agruparPresencasPorJogador,
  type JogadorDoRanking,
  type PartidaDoRanking,
  type PresencaDoRanking,
} from './ranking.js';
import { rodadasDoJogador } from './rodadas.js';

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
  const resolver = criarResolvedorDePesos(entrada.configsPesos);
  const presencasPorJogador = agruparPresencasPorJogador(entrada.partidas, entrada.presencas);

  const depois: JogadorDoRanking = {
    ...alvo,
    inicioPontuacao: novoInicio,
    periodos: alvo.periodos.map((p, i) =>
      i === 0 && compararDatas(novoInicio, p.inicio) < 0 ? { ...p, inicio: novoInicio } : p,
    ),
  };
  const situacoes = new Map((presencasPorJogador.get(jogadorId) ?? []).map((p) => [p.partidaId, p.situacao]));
  const rodadas = (j: JogadorDoRanking) =>
    rodadasDoJogador(j.periodos, entrada.partidas, situacoes, resolver, j.inicioPontuacao);
  const antesDasRodadas = rodadas(alvo);
  const rodadasQuePassamAConstar = rodadas(depois).filter(
    (r, i) => r.situacao !== 'fora' && antesDasRodadas[i]?.situacao === 'fora',
  ).length;

  const cenario = (jogador: JogadorDoRanking) => {
    const outros = entrada.jogadores.filter((j) => j.id !== jogadorId);
    const ativos = ativosEm([...outros, jogador], hoje);
    const acumulados = acumuladosDosAtivos(ativos, presencasPorJogador, resolver, hoje);
    const posicao = ordenarPorRanking(ativos, acumulados).find((c) => c.jogador.id === jogadorId)?.posicao ?? null;
    const acumulado = acumuladoPorInicio({
      inicio: jogador.inicioPontuacao,
      pontuacaoInicial: jogador.pontuacaoInicial,
      presencas: presencasPorJogador.get(jogadorId) ?? [],
      configs: resolver,
      referencia: hoje,
    });
    return { acumulado, posicao };
  };
  const antes = cenario(alvo);
  const apos = cenario(depois);
  return {
    acumuladoAntes: antes.acumulado,
    acumuladoDepois: apos.acumulado,
    posicaoAntes: antes.posicao,
    posicaoDepois: apos.posicao,
    rodadasQuePassamAConstar,
  };
}
