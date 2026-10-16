import { compararDatas, compararMeses, mesAnterior, mesDe, mesSeguinte, type Data, type Mes } from '../datas/datas.js';

export interface PartidaDoMes {
  data: Data;
  choveu: boolean;
}

export interface LimitesDeMes {
  /** Mês da primeira partida do grupo; nulo se não há partidas. */
  primeiro: Mes | null;
  /** Mês de hoje. */
  ultimo: Mes;
}

export interface Navegacao {
  mesAnterior: Mes | null;
  mesSeguinte: Mes | null;
}

export function limitesDeMes(partidas: readonly { data: Data }[], hoje: Data): LimitesDeMes {
  let primeira: Data | null = null;
  for (const p of partidas) if (primeira === null || compararDatas(p.data, primeira) < 0) primeira = p.data;
  return { primeiro: primeira === null ? null : mesDe(primeira), ultimo: mesDe(hoje) };
}

export function mesDentroDosLimites(limites: LimitesDeMes, mes: Mes): boolean {
  return (
    limites.primeiro !== null && compararMeses(mes, limites.primeiro) >= 0 && compararMeses(mes, limites.ultimo) <= 0
  );
}

/** Mês anterior e seguinte dentro dos limites; ambos nulos se o grupo não tem partidas. */
export function navegacaoDeMes(limites: LimitesDeMes, mes: Mes): Navegacao {
  if (limites.primeiro === null) return { mesAnterior: null, mesSeguinte: null };
  return {
    mesAnterior: compararMeses(mes, limites.primeiro) > 0 ? mesAnterior(mes) : null,
    mesSeguinte: compararMeses(mes, limites.ultimo) < 0 ? mesSeguinte(mes) : null,
  };
}

/** Partidas do mês em ordem crescente de data, com o resumo (RF-31). */
export function partidasDoMes<P extends PartidaDoMes>(
  partidas: readonly P[],
  mes: Mes,
): { partidas: P[]; resumo: { partidas: number; comChuva: number } } {
  const doMes = partidas.filter((p) => mesDe(p.data) === mes).sort((a, b) => compararDatas(a.data, b.data));
  return {
    partidas: doMes,
    resumo: { partidas: doMes.length, comChuva: doMes.filter((p) => p.choveu).length },
  };
}
