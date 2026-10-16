import { describe, expect, it } from 'vitest';
import { configuracaoServidor } from '../configuracao-servidor';

describe('configuracaoServidor', () => {
  it('sem variáveis: sem proxy e sem polling', () => {
    expect(configuracaoServidor({})).toEqual({});
    expect(configuracaoServidor({ ALVO_API_DEV: '  ' })).toEqual({});
  });

  it('com ALVO_API_DEV: proxy de /api na mesma origem', () => {
    expect(configuracaoServidor({ ALVO_API_DEV: 'http://backend:8787' }).proxy).toEqual({
      '/api': { target: 'http://backend:8787', changeOrigin: false },
    });
  });

  it('polling só com CHOKIDAR_USEPOLLING=true', () => {
    expect(configuracaoServidor({ CHOKIDAR_USEPOLLING: 'true' }).watch).toEqual({ usePolling: true });
    expect(configuracaoServidor({ CHOKIDAR_USEPOLLING: 'false' }).watch).toBeUndefined();
  });
});
