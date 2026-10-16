export type ResultadoCopia = 'copiado' | 'falhou';
export type ResultadoCompartilhar = 'compartilhado' | 'cancelado' | ResultadoCopia;

/** Copia o texto para a área de transferência; `falhou` se o navegador negar. */
export async function copiarLink(url: string): Promise<ResultadoCopia> {
  try {
    await navigator.clipboard.writeText(url);
    return 'copiado';
  } catch {
    return 'falhou';
  }
}

/**
 * Abre o compartilhamento do aparelho; sem Web Share, faz o mesmo que "Copiar link".
 * Cancelar a janela de compartilhamento não é erro.
 */
export async function compartilharLink(titulo: string, url: string): Promise<ResultadoCompartilhar> {
  if (typeof navigator.share !== 'function') return copiarLink(url);
  try {
    await navigator.share({ title: titulo, url });
    return 'compartilhado';
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') return 'cancelado';
    return copiarLink(url);
  }
}
