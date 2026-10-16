import type { Env } from '../src/config/index.js';

declare module 'cloudflare:test' {
  // O ambiente de teste tem os mesmos bindings e variáveis do Worker.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ProvidedEnv extends Env {}
}
