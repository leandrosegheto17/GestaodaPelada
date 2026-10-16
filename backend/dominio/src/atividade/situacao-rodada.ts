import type { Data } from '../datas/datas.js';
import { ativoEm, type Periodo } from './atividade.js';

/**
 * Situação do jogador numa rodada: a da presença, `falta` (ativo e sem presença, RN-03)
 * ou `fora` (inativo na data, mostrado como "–").
 */
export function situacaoNaRodada<S extends string>(
  periodos: readonly Periodo[],
  data: Data,
  situacao?: S,
): S | 'falta' | 'fora' {
  if (!ativoEm(periodos, data)) return 'fora';
  return situacao ?? 'falta';
}
