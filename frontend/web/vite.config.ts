import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { lerRecursosDesligados } from './src/config/recursos';

export default defineConfig(({ mode }) => {
  // Falha o build (e o dev) se VITE_RECURSOS_DESLIGADOS tiver nome inválido.
  lerRecursosDesligados(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_RECURSOS_DESLIGADOS);
  return {
    plugins: [react()],
    build: { outDir: 'dist' },
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/apoio/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,mjs}', 'e2e/**/*.test.mjs'],
    },
  };
});
