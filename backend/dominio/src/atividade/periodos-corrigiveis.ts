import { compararDatas, type Data } from '../datas/datas.js';
import type { Periodo } from './atividade.js';

export type PeriodoComId = Periodo & { id: string };

export interface PeriodoCorrigivel {
  id: string;
  tipo: 'entrada' | 'retorno';
  inicio: Data;
  fim: Data | null;
  /** O que o admin pode corrigir neste período: a data de saída e/ou a de retorno. */
  corrigivel: { saida: boolean; retorno: boolean };
  saidaAnterior: Data | null;
  inicioDoProximo: Data | null;
}

/**
 * Descreve os períodos em ordem cronológica. O primeiro é a entrada (o início dele não é
 * corrigível); os demais são retornos. Só um período encerrado tem saída a corrigir.
 */
export function descreverPeriodos(periodos: readonly PeriodoComId[]): PeriodoCorrigivel[] {
  const ordenados = [...periodos].sort((a, b) => compararDatas(a.inicio, b.inicio));
  return ordenados.map((periodo, i) => ({
    id: periodo.id,
    tipo: i === 0 ? 'entrada' : 'retorno',
    inicio: periodo.inicio,
    fim: periodo.fim,
    corrigivel: { saida: periodo.fim !== null, retorno: i > 0 },
    saidaAnterior: ordenados[i - 1]?.fim ?? null,
    inicioDoProximo: ordenados[i + 1]?.inicio ?? null,
  }));
}
