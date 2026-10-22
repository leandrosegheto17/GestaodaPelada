import type { Data } from '../datas/datas.js';
import { ativoEm, type Periodo } from './atividade.js';

/**
 * Situação do jogador numa data sem presença gravada: `falta` se está ativo (RN-03) ou `fora`
 * se não está (mostrado como "–"). A presença gravada é decidida por quem chama e tem
 * prioridade sobre os períodos.
 */
export function situacaoNaRodada(periodos: readonly Periodo[], data: Data): 'falta' | 'fora' {
  return ativoEm(periodos, data) ? 'falta' : 'fora';
}
