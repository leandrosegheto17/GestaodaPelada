import { ativosEm, type Periodo } from '../atividade/atividade.js';
import { primeiroDia, somarDias, type Data, type Mes } from '../datas/datas.js';
import { criarResolvedorDePesos } from '../pontuacao/pesos.js';
import { acumuladoAte } from '../pontuacao/pontos.js';
import type { ConfigPesos, PresencaDoJogador, SituacaoPresenca } from '../pontuacao/tipos.js';
import {
  limitesDeMes,
  navegacaoDeMes,
  partidasDoMes,
  type LimitesDeMes,
  type Navegacao,
  type PartidaDoMes,
} from './navegacao.js';
import { ordenarPorRanking } from './ordem.js';
import { rodadasDoJogador, type Rodada } from './rodadas.js';

export interface JogadorDoRanking {
  id: string;
  apelido: string;
  anoNascimento: number;
  periodos: readonly Periodo[];
}

export interface PartidaDoRanking extends PartidaDoMes {
  id: string;
}

export interface PresencaDoRanking {
  partidaId: string;
  jogadorId: string;
  situacao: SituacaoPresenca;
}

export interface EntradaRanking {
  hoje: Data;
  mes: Mes;
  jogadores: readonly JogadorDoRanking[];
  partidas: readonly PartidaDoRanking[];
  presencas: readonly PresencaDoRanking[];
  configsPesos: readonly ConfigPesos[];
}

export interface LinhaRanking {
  jogadorId: string;
  apelido: string;
  posicao: number;
  ptsInicial: number;
  rodadas: Rodada[];
  ptsFinal: number;
}

export interface ResultadoRanking {
  linhas: LinhaRanking[];
  partidas: PartidaDoMes[];
  resumoMes: { partidas: number; comChuva: number };
  navegacao: Navegacao;
  limites: LimitesDeMes;
}

/** Ranking de `mes` visto em `hoje`: ordem pelo acumulado até hoje, igual em qualquer mês. */
export function calcularRanking(entrada: EntradaRanking): ResultadoRanking {
  const { hoje, mes } = entrada;
  const resolver = criarResolvedorDePesos(entrada.configsPesos);
  const dataDaPartida = new Map(entrada.partidas.map((p) => [p.id, p]));

  const presencasPorJogador = new Map<string, (PresencaDoJogador & { partidaId: string })[]>();
  for (const pr of entrada.presencas) {
    const partida = dataDaPartida.get(pr.partidaId);
    if (!partida) continue;
    const lista = presencasPorJogador.get(pr.jogadorId) ?? [];
    lista.push({
      partidaId: pr.partidaId,
      data: partida.data,
      choveu: partida.choveu,
      situacao: pr.situacao,
    });
    presencasPorJogador.set(pr.jogadorId, lista);
  }

  const ativos = ativosEm(entrada.jogadores, hoje);
  const acumulados = new Map(
    ativos.map((j) => [j.id, acumuladoAte(presencasPorJogador.get(j.id) ?? [], resolver, hoje)]),
  );
  const ordem = ordenarPorRanking(ativos, acumulados);

  const { partidas: doMes, resumo } = partidasDoMes(entrada.partidas, mes);
  const vespera = somarDias(primeiroDia(mes), -1);

  const linhas = ordem.map(({ jogador, posicao }): LinhaRanking => {
    const presencas = presencasPorJogador.get(jogador.id) ?? [];
    const ptsInicial = acumuladoAte(presencas, resolver, vespera);
    const rodadas = rodadasDoJogador(
      jogador.periodos,
      doMes,
      new Map(presencas.map((p) => [p.partidaId, p.situacao])),
      resolver,
    );
    const ptsFinal = rodadas.reduce((soma, r) => soma + (r.pontos ?? 0), ptsInicial);
    return {
      jogadorId: jogador.id,
      apelido: jogador.apelido,
      posicao,
      ptsInicial,
      rodadas,
      ptsFinal,
    };
  });

  const limites = limitesDeMes(entrada.partidas, hoje);
  return {
    linhas,
    partidas: doMes.map(({ data, choveu }) => ({ data, choveu })),
    resumoMes: resumo,
    navegacao: navegacaoDeMes(limites, mes),
    limites,
  };
}
