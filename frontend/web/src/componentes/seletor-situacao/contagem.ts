import { SITUACOES_PRESENCA, type SituacaoPresenca } from '@pelada/contrato';

/**
 * Conta as marcações ainda não salvas do formulário. É estado local de tela (contador do que
 * está na tela), não regra de negócio: a API nunca devolve esse número.
 */
export function contarSituacoes(marcacoes: readonly SituacaoPresenca[]): Record<SituacaoPresenca, number> {
  const contagem = Object.fromEntries(SITUACOES_PRESENCA.map((s) => [s, 0])) as Record<SituacaoPresenca, number>;
  for (const m of marcacoes) contagem[m] += 1;
  return contagem;
}
