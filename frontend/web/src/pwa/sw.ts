/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { CABECALHO_DO_CACHE, ehRankingPublico, enderecoNovoDe, servirShell } from './regras-sw';

declare const self: ServiceWorkerGlobalScope;

const CACHE_SINAIS = 'pelada-sinais';
const CHAVE_SINAL = '/__sinal/endereco-novo';

// Só o ranking público é cacheado (ADR-009): nenhuma outra rota /api/* tem estratégia, vai direto à rede.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

self.addEventListener('message', (evento) => {
  if (evento.data && typeof evento.data === 'object' && 'type' in evento.data && evento.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

/** O sinal vive no Cache Storage para sobreviver ao encerramento do service worker. */
async function guardarSinal(ligado: boolean): Promise<void> {
  const cache = await caches.open(CACHE_SINAIS);
  if (ligado) await cache.put(CHAVE_SINAL, new Response('1'));
  else await cache.delete(CHAVE_SINAL);
}

async function sinalLigado(): Promise<boolean> {
  const cache = await caches.open(CACHE_SINAIS);
  return (await cache.match(CHAVE_SINAL)) !== undefined;
}

async function atualizarSinal(resposta: Response): Promise<void> {
  if (!resposta.ok) return;
  try {
    await guardarSinal(enderecoNovoDe(await resposta.json()));
  } catch {
    // Corpo que não é JSON: não muda o sinal.
  }
}

registerRoute(
  ({ url }) => ehRankingPublico(url, self.location.origin),
  new NetworkFirst({
    cacheName: 'ranking-publico',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 50 }),
      {
        // Resposta servida do cache (sem rede): marca para a tela mostrar "Sem conexão".
        cachedResponseWillBeUsed: async ({ cachedResponse }) => {
          if (!cachedResponse) return cachedResponse;
          const cabecalhos = new Headers(cachedResponse.headers);
          cabecalhos.set(CABECALHO_DO_CACHE, '1');
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: cabecalhos,
          });
        },
      },
      {
        fetchDidSucceed: async ({ response }) => {
          await atualizarSinal(response.clone());
          return response;
        },
      },
    ],
  }),
);

// A sessão não é cacheada: só observamos a resposta para detectar `enderecoNovo`.
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname === '/api/sessao/eu',
  async ({ request, event }) => {
    const resposta = await fetch(request);
    event.waitUntil(atualizarSinal(resposta.clone()));
    return resposta;
  },
);

const servirIndex = createHandlerBoundToURL('/index.html');

registerRoute(
  new NavigationRoute(
    async (opcoes) => (servirShell(await sinalLigado()) ? servirIndex(opcoes) : fetch(opcoes.request)),
    { denylist: [/^\/api\//, /^\/\.well-known\//] },
  ),
);
