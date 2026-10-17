import { afterEach, describe, expect, it, vi } from 'vitest';
import { entregarPdf } from './entregar';

const arquivo = () => new File([new Uint8Array([1, 2, 3])], 'ranking-pelada-2026-10.pdf', { type: 'application/pdf' });

function simularNavegador(opcoes: { canShare?: boolean; share?: (dados: ShareData) => Promise<void> }) {
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: opcoes.canShare === undefined ? undefined : () => opcoes.canShare,
  });
  Object.defineProperty(navigator, 'share', { configurable: true, value: opcoes.share });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
  vi.restoreAllMocks();
});

describe('entregarPdf', () => {
  it('com compartilhamento de arquivo: chama share com 1 File application/pdf', async () => {
    const share = vi.fn<(dados: ShareData) => Promise<void>>(async () => undefined);
    simularNavegador({ canShare: true, share });
    expect(await entregarPdf(arquivo(), 'Ranking de outubro')).toBe('compartilhado');
    expect(share).toHaveBeenCalledTimes(1);
    const dados = share.mock.calls[0]?.[0];
    expect(dados?.files).toHaveLength(1);
    expect(dados?.files?.[0]?.type).toBe('application/pdf');
    expect(dados?.title).toBe('Ranking de outubro');
  });

  it('NotAllowedError (perdeu o gesto) pede um novo toque', async () => {
    simularNavegador({
      canShare: true,
      share: async () => {
        throw new DOMException('sem gesto', 'NotAllowedError');
      },
    });
    expect(await entregarPdf(arquivo(), 'x')).toBe('pedir-gesto');
  });

  it('AbortError (pessoa fechou a folha) cancela sem erro', async () => {
    simularNavegador({
      canShare: true,
      share: async () => {
        throw new DOMException('fechou', 'AbortError');
      },
    });
    expect(await entregarPdf(arquivo(), 'x')).toBe('cancelado');
  });

  it('outro erro de compartilhamento sobe para o chamador', async () => {
    simularNavegador({
      canShare: true,
      share: async () => {
        throw new Error('falhou');
      },
    });
    await expect(entregarPdf(arquivo(), 'x')).rejects.toThrow('falhou');
  });

  it('sem compartilhamento de arquivo: baixa por âncora com download e revoga a URL', async () => {
    simularNavegador({ canShare: false, share: async () => undefined });
    const criar = vi.fn(() => 'blob:fake');
    const revogar = vi.fn();
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: revogar });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.useFakeTimers();
    expect(await entregarPdf(arquivo(), 'x')).toBe('baixado');
    expect(clique).toHaveBeenCalledTimes(1);
    expect(criar).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(revogar).toHaveBeenCalledWith('blob:fake');
    vi.useRealTimers();
  });

  it('sem share no navegador: baixa', async () => {
    simularNavegador({});
    Object.assign(URL, { createObjectURL: () => 'blob:fake', revokeObjectURL: () => undefined });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    expect(await entregarPdf(arquivo(), 'x')).toBe('baixado');
  });
});
