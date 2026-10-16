const AREA_ADMIN = /^\/(admin|conta|dono)(\/|$)/;

/** Rota de entrada com o `destino` de volta, ou `null` se a página atual não exige login. */
export function destinoDeEntrada(pathname: string, search: string): string | null {
  if (!AREA_ADMIN.test(pathname)) return null;
  return `/entrar?destino=${encodeURIComponent(pathname + search)}`;
}
