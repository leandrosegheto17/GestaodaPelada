import { calcularNivel } from '@pelada/dominio';
import type { NotaDoGrupo } from '../../infraestrutura/db/repositorios/habilidades.js';

export interface NivelDaResposta {
  /** Nível de 1 a 10 com uma casa decimal (6.8), como o contrato entrega. */
  nivel: number;
  semNota: boolean;
}

/**
 * Converte o nível do domínio (média × 100, ex.: 683) para a unidade da resposta, com meio
 * arredondado para cima na primeira casa, só em inteiros. O × 100 fica interno.
 */
export function nivelDaResposta(notas: readonly number[]): NivelDaResposta {
  const { nivel, semNota } = calcularNivel(notas);
  return { nivel: Math.floor((nivel + 5) / 10) / 10, semNota };
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
