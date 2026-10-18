import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vitest/config';

// O `exports.import` do pg-protocol aponta para um .js em ESM sem "type": "module", que o pool de workers
// carrega como CommonJS e quebra. Aponta-se para a build CommonJS, a mesma que o `require` do pg usa.
const requireDoPg = createRequire(createRequire(import.meta.url).resolve('pg'));
const PG_PROTOCOL_CJS = requireDoPg.resolve('pg-protocol/dist/index.js');
const PG_CLOUDFLARE_CJS = join(dirname(requireDoPg.resolve('pg-cloudflare/package.json')), 'dist', 'index.js');

const BANCO_TESTE = process.env['DATABASE_URL_TESTE'] ?? 'postgres://postgres:postgres@localhost:5432/pelada_teste';

// Dois projetos: `rotas` e `isolamento` rodam o Worker em workerd; o restante roda em Node.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^pg-protocol$/, replacement: PG_PROTOCOL_CJS },
      { find: /^pg-cloudflare$/, replacement: PG_CLOUDFLARE_CJS },
    ],
  },
  test: {
    // Todos os arquivos compartilham o mesmo Postgres de teste: um por vez.
    fileParallelism: false,
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
