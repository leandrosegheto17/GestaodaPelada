const AREA_ADMIN = /^\/(admin|conta|dono)(\/|$)/;

/** Rota de entrada com o `destino` de volta, ou `null` se a página atual não exige login. */
export function destinoDeEntrada(pathname: string, search: string): string | null {
  if (!AREA_ADMIN.test(pathname)) return null;
  return `/entrar?destino=${encodeURIComponent(pathname + search)}`;
}

const INICIO_PERIGOSO = /^\/[/\\]/;

function temControle(texto: string): boolean {
  for (const caractere of texto) {
    const codigo = caractere.codePointAt(0) ?? 0;
    if (codigo < 0x20 || codigo === 0x7f) return true;
  }
  return false;
}

/**
 * Valida o `destino` lido da URL: só caminho local do app. Recusa `//`, `/\`, barra invertida,
 * esquema, caracteres de controle (CR/LF) e codificações que virem qualquer uma dessas formas.
 */
export function lerDestino(texto: string | null | undefined): string | null {
  if (!texto || !texto.startsWith('/')) return null;
  let decodificado: string;
  try {
    decodificado = decodeURIComponent(texto);
  } catch {
    return null;
  }
  for (const forma of [texto, decodificado]) {
    if (INICIO_PERIGOSO.test(forma) || forma.includes('\\') || temControle(forma)) return null;
  }
  return texto;
}
