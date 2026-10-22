import type { PeriodoPreviaResposta } from '@pelada/contrato';
import { listaDeDatas } from './listaDeDatas';

type Rodadas = PeriodoPreviaResposta['rodadasQuePassamAConstar'];

/** "1 rodada passa a constar: 15/10." (ou "passou", no passado, depois de gravar); `null` sem rodadas. */
export function fraseDasRodadasQueEntram(rodadas: Rodadas, tempo: 'presente' | 'passado' = 'presente'): string | null {
  if (rodadas.length === 0) return null;
  const [singular, plural] = tempo === 'passado' ? ['passou', 'passaram'] : ['passa', 'passam'];
  const verbo = rodadas.length === 1 ? `1 rodada ${singular}` : `${rodadas.length} rodadas ${plural}`;
  return `${verbo} a constar: ${listaDeDatas(rodadas.map((r) => r.data))}.`;
}

/** "2 rodadas deixam de constar: 15/10 e 22/10."; `null` sem rodadas. */
export function fraseDasRodadasQueSaem(rodadas: PeriodoPreviaResposta['rodadasQueDeixamDeConstar']): string | null {
  if (rodadas.length === 0) return null;
  const verbo = rodadas.length === 1 ? '1 rodada deixa' : `${rodadas.length} rodadas deixam`;
  return `${verbo} de constar: ${listaDeDatas(rodadas.map((r) => r.data))}.`;
}
