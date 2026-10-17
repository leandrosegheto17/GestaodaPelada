import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { criarOpcoesPwa, lerCoresDoTema } from './config/manifesto';
import { configuracaoServidor } from './configuracao-servidor';
import { lerRecursosDesligados } from './src/config/recursos';

/** `theme-color` vem do token, sem repetir o valor no HTML-fonte. */
function corDoTema(): Plugin {
  return {
    name: 'cor-do-tema',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { name: 'theme-color', content: lerCoresDoTema().tema }, injectTo: 'head' },
    ],
  };
}

export default defineConfig(({ mode }) => {
  // Falha o build (e o dev) se VITE_RECURSOS_DESLIGADOS tiver nome inválido.
  lerRecursosDesligados(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_RECURSOS_DESLIGADOS);
  const emTeste = Boolean(process.env.VITEST);
  return {
    plugins: [react(), corDoTema(), ...(emTeste ? [] : [VitePWA(criarOpcoesPwa())])],
    resolve: emTeste
      ? { alias: { 'virtual:pwa-register/react': resolve(import.meta.dirname, 'test/apoio/pwa-register-react.ts') } }
      : {},
    build: { outDir: 'dist' },
    server: configuracaoServidor(process.env),
    test: {
      environment: 'jsdom',
      css: { include: /\.module\.css$|\.css\?raw$/ },
      setupFiles: ['./test/apoio/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,mjs}', 'e2e/**/*.test.mjs'],
    },
  };
});
