/** Para buscar: sem caixa, sem acento, sem espaços nas pontas ("leo" acha "Léo Baiano"). */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** `true` se `termo` aparece em `texto` ignorando caixa e acento. Termo vazio acha tudo. */
export function contemBusca(texto: string, termo: string): boolean {
  return normalizarBusca(texto).includes(normalizarBusca(termo));
}
