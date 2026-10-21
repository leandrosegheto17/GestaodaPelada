import { ativosEm } from '../atividade/atividade.js';
import { somarDias } from '../datas/datas.js';
import { criarResolvedorDePesos } from '../pontuacao/pesos.js';
import { acumuladoPorInicio } from '../pontuacao/acumulado-inicio.js';
import { rodadasDoJogador, type Rodada } from '../ranking/rodadas.js';
import { agruparPresencasPorJogador, calcularRanking, type EntradaRanking } from '../ranking/ranking.js';
import { escolherColunasPdf, type ColunaPdf } from './colunas.js';

export interface LinhaPdf {
  jogadorId: string;
  posicao: number;
  apelido: string;
  /** Acumulado antes da primeira coluna impressa. */
  ptsInicial: number;
  /** Uma rodada por coluna, na ordem das colunas. */
  rodadas: Rodada[];
  /** Acumulado do mês exibido (o mesmo do ranking). */
  ptsFinal: number;
}

export interface ProjecaoPdf {
  semPartidasNoMes: boolean;
  colunas: ColunaPdf[];
  linhas: LinhaPdf[];
}

/**
 * Dados do PDF do mês: as mesmas linhas, ordem e pontos finais do ranking, com as colunas escolhidas por
 * `escolherColunasPdf`. Como as colunas são seguidas até a última partida do mês e `ptsInicial` é o
 * acumulado do dia anterior à primeira coluna, `ptsInicial` + pontos das colunas (fora = 0) = `ptsFinal`.
 * Sem colunas, `ptsInicial` = `ptsFinal`.
 */
export function calcularPdf(entrada: EntradaRanking): ProjecaoPdf {
  const ranking = calcularRanking(entrada);
  const { colunas, semPartidasNoMes } = escolherColunasPdf(entrada.partidas, entrada.mes);
  const resolver = criarResolvedorDePesos(entrada.configsPesos);
  const ativos = new Map(ativosEm(entrada.jogadores, entrada.hoje).map((j) => [j.id, j]));
  const presencasPorJogador = agruparPresencasPorJogador(entrada.partidas, entrada.presencas);

  const primeira = colunas[0];
  const linhas = ranking.linhas.map((linha): LinhaPdf => {
    const presencas = presencasPorJogador.get(linha.jogadorId) ?? [];
    const jogador = ativos.get(linha.jogadorId);
    const rodadas = rodadasDoJogador(
      jogador?.periodos ?? [],
      colunas,
      new Map(presencas.map((p) => [p.partidaId, p.situacao])),
      resolver,
      jogador?.inicioPontuacao,
    );
    return {
      jogadorId: linha.jogadorId,
      posicao: linha.posicao,
      apelido: linha.apelido,
      ptsInicial: primeira
        ? acumuladoPorInicio({
            inicio: jogador?.inicioPontuacao,
            pontuacaoInicial: jogador?.pontuacaoInicial ?? 0,
            presencas,
            configs: resolver,
            referencia: somarDias(primeira.data, -1),
          })
        : linha.ptsFinal,
      rodadas,
      ptsFinal: linha.ptsFinal,
    };
  });
  return { semPartidasNoMes, colunas, linhas };
}
