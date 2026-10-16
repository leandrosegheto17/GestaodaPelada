/** Nível de quem ainda não tem nota: o meio da escala, em centésimos de ponto (5,50). */
export const NIVEL_SEM_NOTA = 550;

export interface Nivel {
  /** Média das notas × 100, em inteiro. */
  nivel: number;
  semNota: boolean;
}

/**
 * Nível = média das notas × 100, com meio arredondado para cima, só em inteiros:
 * `floor((200 · soma + n) / (2 · n))`. Ex.: notas 8, 7, 6, 7, 8, 5 → 683.
 * Sem notas, vale `NIVEL_SEM_NOTA` e `semNota` é verdadeiro.
 */
export function calcularNivel(notas: readonly number[]): Nivel {
  const n = notas.length;
  if (n === 0) return { nivel: NIVEL_SEM_NOTA, semNota: true };
  const soma = notas.reduce((total, nota) => total + nota, 0);
  return { nivel: Math.floor((200 * soma + n) / (2 * n)), semNota: false };
}
