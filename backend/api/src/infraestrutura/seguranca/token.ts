/** Token de sessão opaco: 256 bits aleatórios em base64url. O banco guarda só o SHA-256. */
export function gerarTokenSessao(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return paraBase64Url(bytes);
}

/** SHA-256 do token (32 bytes), como `sessoes.token_hash`. */
export async function hashToken(token: string): Promise<Uint8Array> {
  const resumo = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return new Uint8Array(resumo);
}

function paraBase64Url(bytes: Uint8Array): string {
  let texto = '';
  for (const byte of bytes) texto += String.fromCharCode(byte);
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
