import { calcularNivel } from '@pelada/dominio';
import type { NotaDoGrupo } from '../../infraestrutura/db/repositorios/habilidades.js';

export interface NivelDaResposta {
  /** Nível de 1 a 10 com uma casa decimal (6.8), como o contrato entrega. */
  nivel: number;
  semNota: boolean;
}

/** Valor em centésimos (683) para a unidade da resposta com uma casa (6.8), meio para cima, só em inteiros. */
export function centesimosParaDecimal(centesimos: number): number {
  return Math.floor((centesimos + 5) / 10) / 10;
}

/** Nível do domínio (média × 100, ex.: 683) na unidade da resposta. O × 100 fica interno. */
export function nivelDaResposta(notas: readonly number[]): NivelDaResposta {
  const { nivel, semNota } = calcularNivel(notas);
  return { nivel: centesimosParaDecimal(nivel), semNota };
}

/** Agrupa as notas do grupo por jogador, numa passada. */
export function notasPorJogador(notas: readonly NotaDoGrupo[]): Map<string, number[]> {
  const porJogador = new Map<string, number[]>();
  for (const n of notas) {
    const lista = porJogador.get(n.jogadorId);
    if (lista) lista.push(n.nota);
    else porJogador.set(n.jogadorId, [n.nota]);
  }
  return porJogador;
}

/** Nível (unidade da resposta) de cada jogador que tem nota; quem não aparece é "sem nota". */
export function niveisPorJogador(notas: readonly NotaDoGrupo[]): Map<string, NivelDaResposta> {
  return new Map([...notasPorJogador(notas)].map(([jogadorId, lista]) => [jogadorId, nivelDaResposta(lista)]));
}
