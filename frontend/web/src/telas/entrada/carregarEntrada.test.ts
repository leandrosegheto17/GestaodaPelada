import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as armazenamento from '../../pwa/armazenamento';
import { carregarEntrada } from './carregarEntrada';

vi.mock('../../pwa/armazenamento', () => ({ grupoLembrado: vi.fn(), esquecerGrupo: vi.fn() }));

const lembrado = vi.mocked(armazenamento.grupoLembrado);
const esquecer = vi.mocked(armazenamento.esquecerGrupo);
beforeEach(() => {
  lembrado.mockReset();
  esquecer.mockReset();
});

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

  it.each(['../admin', 'PELADA', 'a b', 'x'.repeat(65), '//evil.com'])(
    'slug malformado %s → esquece e mostra a tela sem grupo',
    async (valor) => {
      lembrado.mockResolvedValue(valor);
      expect(await carregarEntrada()).toBeNull();
      expect(esquecer).toHaveBeenCalledOnce();
    },
  );
});
