import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as armazenamento from '../../pwa/armazenamento';
import { carregarEntrada } from './carregarEntrada';

vi.mock('../../pwa/armazenamento', () => ({ grupoLembrado: vi.fn() }));

const lembrado = vi.mocked(armazenamento.grupoLembrado);
beforeEach(() => lembrado.mockReset());

describe('carregarEntrada', () => {
  it('grupo lembrado → redireciona para o ranking do grupo', async () => {
    lembrado.mockResolvedValue('pelada-de-quinta');
    const resposta = await carregarEntrada();
    expect(resposta).toBeInstanceOf(Response);
    expect(resposta?.status).toBe(302);
    expect(resposta?.headers.get('Location')).toBe('/g/pelada-de-quinta');
  });

  it('nada lembrado → mostra a tela sem grupo', async () => {
    lembrado.mockResolvedValue(null);
    expect(await carregarEntrada()).toBeNull();
  });

  it('falha do armazenamento → null, sem lançar', async () => {
    lembrado.mockRejectedValue(new Error('indisponível'));
    expect(await carregarEntrada()).toBeNull();
  });
});
