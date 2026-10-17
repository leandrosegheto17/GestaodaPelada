import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  testIgnore: 'integracao/**',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:8788' } }],
  webServer: {
    command: 'pnpm --filter @pelada/api exec wrangler dev --config ../../wrangler.jsonc --port 8788 --ip 127.0.0.1',
    cwd: '../../..',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
