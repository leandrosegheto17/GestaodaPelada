import { compararDatas, primeiroDia, ultimoDia, type Data, type Mes } from '../datas/datas.js';

/**
 * Período de atividade em intervalo semiaberto `[inicio, fim)`: o jogador está ativo
 * quando `inicio ≤ data` e (`fim` nulo ou `data < fim`). Inativar e reativar no mesmo dia
 * gera `[a, d)` e `[d, ∞)`, sem sobreposição.
 */
export interface Periodo {
  inicio: Data;
  fim: Data | null;
}

export interface ComPeriodos {
  periodos: readonly Periodo[];
}

export function ativoEm(periodos: readonly Periodo[], data: Data): boolean {
  return periodos.some(
    (p) => compararDatas(p.inicio, data) <= 0 && (p.fim === null || compararDatas(data, p.fim) < 0),
  );
}

export function ativosEm<T extends ComPeriodos>(jogadores: readonly T[], data: Data): T[] {
  return jogadores.filter((j) => ativoEm(j.periodos, data));
}

/** Ativo em algum dia do mês (RF-60). */
export function ativoNoMes(periodos: readonly Periodo[], mes: Mes): boolean {
  const primeiro = primeiroDia(mes);
  const ultimo = ultimoDia(mes);
  return periodos.some(
    (p) =>
      compararDatas(p.inicio, ultimo) <= 0 &&
      (p.fim === null || compararDatas(p.fim, primeiro) > 0),
  );
}

export function ativosNoMes<T extends ComPeriodos>(jogadores: readonly T[], mes: Mes): T[] {
  return jogadores.filter((j) => ativoNoMes(j.periodos, mes));
}
