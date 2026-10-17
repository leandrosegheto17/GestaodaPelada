interface RotaRegistrada {
  method: string;
  path: string;
  handler: (...args: never[]) => unknown;
}

/**
 * No Hono, `app.use` e `app.all` geram a mesma entrada de método `ALL`. O que as distingue é a
 * aridade do handler: middleware recebe `(c, proximo)` (2 parâmetros ou mais); handler de rota
 * recebe só `(c)`. Entrada `ALL` com aridade 2+ é middleware e fica de fora; `ALL` com aridade
 * menor é rota de negócio registrada por `app.all` e entra na lista, exigindo caso. Middleware
 * escrito sem declarar `proximo` seria tratado como rota e apareceria como "sem caso" (falha
 * visível, nunca silenciosa).
 */
function ehMiddleware(rota: RotaRegistrada): boolean {
  return rota.method === 'ALL' && rota.handler.length >= 2;
}

/** Lista as rotas `/api/*` registradas no app, como `"MÉTODO caminho"`, sem os middlewares. */
export function listarRotas(app: { routes: readonly RotaRegistrada[] }): string[] {
  const chaves = new Set<string>();
  for (const rota of app.routes) {
    if (ehMiddleware(rota)) continue;
    if (!rota.path.startsWith('/api/')) continue;
    chaves.add(`${rota.method} ${rota.path}`);
  }
  return [...chaves].sort();
}
