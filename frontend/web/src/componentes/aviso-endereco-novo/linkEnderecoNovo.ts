/**
 * Monta o link da mesma tela no endereço novo. Falha fechado: devolve `null` se o endereço
 * não for uma URL `https:` válida, e o resultado sempre fica no host de `enderecoNovo`.
 * `rota` é `pathname + search + hash` da tela atual.
 */
export function linkEnderecoNovo(enderecoNovo: string | null | undefined, rota: string): string | null {
  if (!enderecoNovo) return null;
  let destino: URL;
  try {
    destino = new URL(enderecoNovo);
  } catch {
    return null;
  }
  if (destino.protocol !== 'https:' || destino.username || destino.password) return null;

  const [semHash = '', ...restoHash] = rota.split('#');
  const [caminho = '', ...restoBusca] = semHash.split('?');
  // Barras repetidas no começo virariam "//outro-host": o caminho é sempre só o caminho.
  destino.pathname = '/' + caminho.replace(/\\/g, '/').replace(/^\/+/, '');
  destino.search = restoBusca.length ? restoBusca.join('?') : '';
  destino.hash = restoHash.length ? restoHash.join('#') : '';
  return destino.href;
}
