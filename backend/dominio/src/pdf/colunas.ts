import { compararDatas, mesDe, ultimoDia, type Data, type Mes } from '../datas/datas.js';

/** Máximo de colunas de partida no PDF (uma página). */
export const MAX_COLUNAS_PDF = 12;

export interface ColunaPdf {
  id: string;
  data: Data;
  choveu: boolean;
  /** A partida é do mês exibido (as outras são do mês anterior ou de antes). */
  doMesExibido: boolean;
}

export interface ColunasPdf {
  colunas: ColunaPdf[];
  /** O mês exibido não tem partidas: as colunas são só de meses anteriores. */
  semPartidasNoMes: boolean;
}

/**
 * Colunas do PDF do mês `mes`: as partidas do mês e, para completar, as anteriores mais recentes, até
 * `MAX_COLUNAS_PDF`, em ordem cronológica. Partidas depois do fim do mês não entram. Se o mês tiver mais
 * partidas que o limite, ficam as mais recentes do mês.
 */
export function escolherColunasPdf(
  partidas: readonly { id: string; data: Data; choveu: boolean }[],
  mes: Mes,
): ColunasPdf {
  const fim = ultimoDia(mes);
  const ate = partidas.filter((p) => compararDatas(p.data, fim) <= 0).sort((a, b) => compararDatas(a.data, b.data));
  const escolhidas = ate.slice(-MAX_COLUNAS_PDF);
  const colunas = escolhidas.map((p) => ({
    id: p.id,
    data: p.data,
    choveu: p.choveu,
    doMesExibido: mesDe(p.data) === mes,
  }));
  return { colunas, semPartidasNoMes: !ate.some((p) => mesDe(p.data) === mes) };
}
