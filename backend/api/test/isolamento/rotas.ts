/**
 * Lista as rotas `/api/*` registradas no app, como `"MÉTODO caminho"`. Entradas com método `ALL`
 * são middlewares registrados por `use` e ficam de fora; por isso rota de negócio nunca deve ser
 * registrada com `app.all` (a suíte não a veria).
 */
export function listarRotas(app: { routes: readonly { method: string; path: string }[] }): string[] {
  const chaves = new Set<string>();
  for (const rota of app.routes) {
    if (rota.method === 'ALL') continue;
    if (!rota.path.startsWith('/api/')) continue;
    chaves.add(`${rota.method} ${rota.path}`);
  }
  return [...chaves].sort();
}
