/** Substituto de `virtual:pwa-register/react` nos testes (o plugin PWA não roda no Vitest). */
export function useRegisterSW(): {
  needRefresh: [boolean, (valor: boolean) => void];
  offlineReady: [boolean, (valor: boolean) => void];
  updateServiceWorker: (recarregar?: boolean) => Promise<void>;
} {
  return {
    needRefresh: [false, () => undefined],
    offlineReady: [false, () => undefined],
    updateServiceWorker: () => Promise.resolve(),
  };
}
