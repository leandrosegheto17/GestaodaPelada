/** Pontos de pontuação: `-1` → `−1` (U+2212), sem `+`. */
export function formatarPontos(n: number): string {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Pontos inválidos: ${n}.`);
  return n < 0 ? `−${-n}` : String(n);
}
