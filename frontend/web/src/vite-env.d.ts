/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Recursos desligados no build, separados por vírgula (simulador, pdf, financeiro, privacidade). */
  readonly VITE_RECURSOS_DESLIGADOS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
