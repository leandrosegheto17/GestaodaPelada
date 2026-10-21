import { compararDatas, type Data } from '../datas/datas.js';
import type { ResolvedorDePesos } from './pesos.js';
import { acumuladoAte, acumuladoComInicial } from './pontos.js';
import type { ConfigPesos, PresencaDoJogador } from './tipos.js';

export interface EntradaAcumulado {
  /** Data de início da pontuação (S). Omitida: vale tudo o que o jogador tem, desde o cadastro. */
  inicio?: Data | undefined;
  pontuacaoInicial: number;
  /** Todo o histórico de presenças do jogador, inclusive as anteriores a `inicio`. */
  presencas: readonly PresencaDoJogador[];
  configs: readonly ConfigPesos[] | ResolvedorDePesos;
  referencia: Data;
}

/**
 * Único cálculo de acumulado do sistema (ranking, PDF, simulador e importação). Soma as partidas com
 * `inicio <= data <= referencia`; a pontuação inicial só vale quando `inicio` não passa da primeira presença
 * do histórico (ou quando não há presença), porque ela representa o que veio antes da primeira partida.
 */
export function acumuladoPorInicio(entrada: EntradaAcumulado): number {
  const { inicio, pontuacaoInicial, presencas, configs, referencia } = entrada;
  if (inicio === undefined) return acumuladoComInicial(pontuacaoInicial, presencas, configs, referencia);

  const primeira = presencas.reduce<Data | undefined>(
    (menor, pr) => (menor === undefined || compararDatas(pr.data, menor) < 0 ? pr.data : menor),
    undefined,
  );
  const inicialVale = primeira === undefined || compararDatas(inicio, primeira) <= 0;
  const aPartirDoInicio = presencas.filter((pr) => compararDatas(pr.data, inicio) >= 0);
  return (inicialVale ? pontuacaoInicial : 0) + acumuladoAte(aPartirDoInicio, configs, referencia);
}
