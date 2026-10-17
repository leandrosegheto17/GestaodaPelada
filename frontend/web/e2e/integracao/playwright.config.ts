import { defineConfig, devices } from '@playwright/test';

// Integração do I1: app e API reais pelo `docker compose` (sem webServer, sem respostas falsas).
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  retries: 0,
  // O Vite em modo dev compila cada tela na primeira visita; os prazos folgados evitam falso negativo.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
