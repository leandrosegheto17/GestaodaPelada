import type { RouteObject } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

function caminhos(rotas: readonly RouteObject[], prefixo = ''): string[] {
  return rotas.flatMap((r) => {
    const completo = r.path ? `${prefixo}/${r.path}`.replace(/\/+/g, '/') : prefixo;
    return [...(r.path ? [completo] : []), ...caminhos(r.children ?? [], completo)];
  });
}

async function carregarRoteador(desligados: string) {
  vi.resetModules();
  vi.stubEnv('VITE_RECURSOS_DESLIGADOS', desligados);
  const { roteador } = await import('./rotas');
  return caminhos(roteador.routes);
}

afterEach(() => vi.unstubAllEnvs());

describe('rotas do simulador', () => {
  it('com o recurso ligado, a tela de habilidades existe sob o grupo', async () => {
    expect(await carregarRoteador('')).toContain('/admin/:grupoId/habilidades');
  });

  it('com o recurso desligado, a rota não é registrada e as demais continuam', async () => {
    const rotas = await carregarRoteador('simulador');
    expect(rotas).not.toContain('/admin/:grupoId/habilidades');
    expect(rotas).toContain('/admin/:grupoId/partidas');
  });
});
