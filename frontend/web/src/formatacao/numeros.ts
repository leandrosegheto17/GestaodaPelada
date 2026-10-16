/** Pontos de pontuação: `-1` → `−1` (U+2212), sem `+`. */
export function formatarPontos(n: number): string {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Pontos inválidos: ${n}.`);
  return n < 0 ? `−${-n}` : String(n);
}

/** Pontos por extenso para leitor de tela: `1 ponto`, `0 pontos`, `menos 1 ponto`. */
export function pontosFalados(n: number): string {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Pontos inválidos: ${n}.`);
  const modulo = Math.abs(n);
  return `${n < 0 ? 'menos ' : ''}${modulo} ${modulo === 1 ? 'ponto' : 'pontos'}`;
}

const formatoNivel = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nível do jogador com uma casa: `6.1` → `6,1`, `6` → `6,0`. */
export function formatarNivel(nivel: number): string {
  if (!Number.isFinite(nivel)) throw new RangeError(`Nível inválido: ${nivel}.`);
  return formatoNivel.format(nivel);
}
