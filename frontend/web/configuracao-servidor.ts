import type { ServerOptions } from 'vite';

/** Servidor de desenvolvimento: proxy de /api só quando `ALVO_API_DEV` existe; polling no Docker/Windows. */
export function configuracaoServidor(env: Record<string, string | undefined>): ServerOptions {
  const servidor: ServerOptions = {};
  const alvo = env.ALVO_API_DEV?.trim();
  if (alvo) servidor.proxy = { '/api': { target: alvo, changeOrigin: false } };
  if (env.CHOKIDAR_USEPOLLING === 'true') servidor.watch = { usePolling: true };
  return servidor;
}
