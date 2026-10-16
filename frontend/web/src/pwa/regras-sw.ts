/** Cabeçalho que o service worker põe numa resposta servida do cache (sem rede). */
export const CABECALHO_DO_CACHE = 'X-Pelada-Cache';

const RANKING_PUBLICO = /^\/api\/publico\/[a-z0-9-]{1,64}\/ranking$/;

/** Único endpoint cacheado (network-first): o ranking público, na mesma origem. A query é livre. */
export function ehRankingPublico(url: URL, origem: string): boolean {
  return url.origin === origem && RANKING_PUBLICO.test(url.pathname);
}

export function ehApi(url: URL, origem: string): boolean {
  return url.origin === origem && (url.pathname === '/api' || url.pathname.startsWith('/api/'));
}

/** `enderecoNovo` preenchido na resposta liga a saída de emergência; nulo ou ausente desliga. */
export function enderecoNovoDe(json: unknown): boolean {
  if (typeof json !== 'object' || json === null || !('enderecoNovo' in json)) return false;
  return typeof json.enderecoNovo === 'string' && json.enderecoNovo.length > 0;
}

/** Com a saída de emergência ligada, o SW deixa de servir o shell em navegação. */
export function servirShell(saidaDeEmergenciaLigada: boolean): boolean {
  return !saidaDeEmergenciaLigada;
}
