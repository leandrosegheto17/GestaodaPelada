import { compararDatas } from '../datas/datas.js';
import type { Periodo } from './atividade.js';

export type ResultadoPeriodos =
  | { ok: true }
  | {
      ok: false;
      erro: 'sobreposicao' | 'mais-de-um-aberto' | 'saida-antes-da-entrada';
      indice: number;
    };

/** Valida os períodos de um jogador. `indice` aponta a posição original do período com problema. */
export function validarPeriodos(periodos: readonly Periodo[]): ResultadoPeriodos {
  const indexados = periodos.map((p, indice) => ({ ...p, indice }));
  for (const p of indexados) {
    if (p.fim !== null && compararDatas(p.fim, p.inicio) < 0) {
      return { ok: false, erro: 'saida-antes-da-entrada', indice: p.indice };
    }
  }
  const abertos = indexados.filter((p) => p.fim === null);
  if (abertos.length > 1) return { ok: false, erro: 'mais-de-um-aberto', indice: abertos[1]!.indice };

  const ordenados = [...indexados].sort((a, b) => compararDatas(a.inicio, b.inicio));
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1]!;
    const atual = ordenados[i]!;
    if (anterior.fim === null || compararDatas(atual.inicio, anterior.fim) < 0) {
      return { ok: false, erro: 'sobreposicao', indice: atual.indice };
    }
  }
  return { ok: true };
}
