import { compararApelido } from '@pelada/dominio';
import type { SituacaoPresenca } from '@pelada/contrato';

export interface LinhaDePresenca {
  id: string;
  apelido: string;
  situacao: SituacaoPresenca;
}

/**
 * Uma linha por jogador, por apelido. Quem não tem presença gravada aparece como `ausente`
 * (a ausência não é gravada). Recebe os jogadores que devem aparecer (ativos na data e, na
 * edição, quem já tem presença).
 */
export function montarLinhas(
  jogadores: readonly { id: string; apelido: string }[],
  presencas: ReadonlyMap<string, SituacaoPresenca>,
): LinhaDePresenca[] {
  return [...jogadores]
    .sort(compararApelido)
    .map((j) => ({ id: j.id, apelido: j.apelido, situacao: presencas.get(j.id) ?? 'ausente' }));
}
