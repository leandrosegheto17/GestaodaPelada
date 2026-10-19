import { readFileSync } from 'node:fs';

/**
 * Confere a resposta de GET /accounts/{conta}/hyperdrive/configs/{id} da API da Cloudflare:
 * só passa com `success === true` e `result.caching.disabled === true` (booleano). Qualquer outra
 * coisa (vazio, JSON inválido, erro da API, campo ausente ou de outro tipo) lança: falha fechado.
 */
export function cacheDoHyperdriveDesligado(corpo: string): void {
  let resposta: unknown;
  try {
    resposta = JSON.parse(corpo);
  } catch {
    throw new Error('Resposta da API do Hyperdrive não é JSON.');
  }
  const { success, result } = (resposta ?? {}) as {
    success?: unknown;
    result?: { caching?: { disabled?: unknown } } | null;
  };
  if (success !== true) throw new Error('A API do Hyperdrive não respondeu com sucesso.');
  if (result?.caching?.disabled !== true) throw new Error('Cache do Hyperdrive ligado ou ausente na resposta (G-17).');
}

// Uso (deploy.yml): curl ... | tsx verificar-cache-hyperdrive.ts   (lê a resposta da API em stdin)
if (import.meta.main) {
  try {
    cacheDoHyperdriveDesligado(readFileSync(0, 'utf8'));
  } catch (erro) {
    console.error((erro as Error).message);
    process.exit(1);
  }
}
