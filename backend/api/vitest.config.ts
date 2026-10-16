import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const BANCO_TESTE =
  process.env['DATABASE_URL_TESTE'] ?? 'postgres://postgres:postgres@localhost:5432/pelada_teste';

// Dois projetos: `rotas` e `isolamento` rodam o Worker em workerd; o restante roda em Node.
export default defineConfig({
  test: {
    globalSetup: ['./test/apoio/setup-global.ts'],
    projects: [
      {
        test: {
          name: 'node',
          include: ['test/**/*.test.ts'],
          exclude: ['test/rotas/**', 'test/isolamento/**'],
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: '../../wrangler.jsonc' },
            miniflare: { hyperdrives: { HYPERDRIVE: BANCO_TESTE } },
          }),
        ],
        test: {
          name: 'workers',
          include: ['test/rotas/**/*.test.ts', 'test/isolamento/**/*.test.ts'],
        },
      },
    ],
  },
});
