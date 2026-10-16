/** Único lugar que monta o link público do grupo; a base vem de `URL_PUBLICA` (ADR-010). */
export function urlPublicaDoGrupo(urlPublica: string, slug: string): string {
  return `${urlPublica.replace(/\/+$/, '')}/g/${slug}`;
}
