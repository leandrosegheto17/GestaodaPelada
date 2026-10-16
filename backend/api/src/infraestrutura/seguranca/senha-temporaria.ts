/** Alfabeto sem caracteres ambíguos (sem 0, O, o, 1, l, I). */
export const ALFABETO_SENHA_TEMPORARIA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export const TAMANHO_SENHA_TEMPORARIA = 12;

type FonteAleatoria = (bytes: Uint8Array) => Uint8Array;

/**
 * Senha temporária de 12 caracteres, sem viés: bytes acima do maior múltiplo do alfabeto
 * são descartados em vez de reduzidos por módulo.
 */
export function gerarSenhaTemporaria(fonte: FonteAleatoria = (bytes) => crypto.getRandomValues(bytes)): string {
  const n = ALFABETO_SENHA_TEMPORARIA.length;
  const limite = Math.floor(256 / n) * n;
  let senha = '';
  while (senha.length < TAMANHO_SENHA_TEMPORARIA) {
    const bytes = fonte(new Uint8Array(TAMANHO_SENHA_TEMPORARIA * 2));
    for (const byte of bytes) {
      if (byte >= limite) continue;
      senha += ALFABETO_SENHA_TEMPORARIA[byte % n];
      if (senha.length === TAMANHO_SENHA_TEMPORARIA) break;
    }
  }
  return senha;
}
