import { compararDatas, type Data } from '../datas/datas.js';
import type { ResolvedorDePesos } from './pesos.js';
import { acumuladoAte, acumuladoComInicial } from './pontos.js';
import type { ConfigPesos, PresencaDoJogador } from './tipos.js';

/**
 * Data de início da pontuação em vigor (RN-25): a gravada ou, sem ela, o início do primeiro período
 * (os períodos chegam em ordem de início).
 */
export function inicioEfetivo(jogador: {
  inicioPontuacao?: Data | null | undefined;
  periodos: readonly { inicio: Data }[];
}): Data | undefined {
  return jogador.inicioPontuacao ?? jogador.periodos[0]?.inicio;
}

export interface EntradaAcumulado {
  /** Data de início da pontuação (S). Omitida: vale tudo o que o jogador tem, desde o cadastro. */
  inicio?: Data | undefined;
  pontuacaoInicial: number;
  /** Todo o histórico de presenças do jogador, inclusive as anteriores a `inicio`. */
  presencas: readonly PresencaDoJogador[];
  configs: readonly ConfigPesos[] | ResolvedorDePesos;
  referencia: Data;
  /** Períodos do jogador, em ordem de início. Com eles, quem saiu e voltou conta só a partir do retorno. */
  periodos?: readonly { inicio: Data }[] | undefined;
  /** Data que escolhe o período ativo (padrão: `referencia`); o PTS INICIAL de um mês usa o próprio mês. */
  periodoEm?: Data | undefined;
}

/**
 * Início da contagem na data `em`: no 1º período vale `inicio` (a data de início do jogador); nos
 * seguintes, o retorno. Sem períodos, ou antes de qualquer um, vale `inicio`.
 */
export function inicioDoPeriodo(inicio: Data, periodos: readonly { inicio: Data }[] | undefined, em: Data): Data {
  let ativo = 0;
  periodos?.forEach((periodo, i) => {
    if (compararDatas(periodo.inicio, em) <= 0) ativo = i;
  });
  return ativo > 0 ? periodos![ativo]!.inicio : inicio;
}

/**
 * Único cálculo de acumulado do sistema (ranking, PDF, simulador e importação). Soma as partidas com
 * `inicio <= data <= referencia` (o `inicio` é o do período ativo, ver `inicioDoPeriodo`); a pontuação inicial só vale quando `inicio` não passa da primeira presença
 * do histórico (ou quando não há presença), porque ela representa o que veio antes da primeira partida.
 */
export function acumuladoPorInicio(entrada: EntradaAcumulado): number {
  const { pontuacaoInicial, presencas, configs, referencia } = entrada;
  if (entrada.inicio === undefined) return acumuladoComInicial(pontuacaoInicial, presencas, configs, referencia);
  const inicio = inicioDoPeriodo(entrada.inicio, entrada.periodos, entrada.periodoEm ?? referencia);

  const primeira = presencas.reduce<Data | undefined>(
    (menor, pr) => (menor === undefined || compararDatas(pr.data, menor) < 0 ? pr.data : menor),
    undefined,
  );
  const inicialVale = primeira === undefined || compararDatas(inicio, primeira) <= 0;
  const aPartirDoInicio = presencas.filter((pr) => compararDatas(pr.data, inicio) >= 0);
  return (inicialVale ? pontuacaoInicial : 0) + acumuladoAte(aPartirDoInicio, configs, referencia);
}
