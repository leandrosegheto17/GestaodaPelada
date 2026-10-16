import { describe, expect, it } from 'vitest';
import { criarFabrica } from './apoio/fabrica.js';

describe('fábrica de teste', () => {
  it('limpa na ordem inversa', async () => {
    const ordem: number[] = [];
    const fabrica = criarFabrica();
    fabrica.registrar(() => void ordem.push(1));
    fabrica.registrar(() => void ordem.push(2));
    await fabrica.limpar();
    expect(ordem).toEqual([2, 1]);
  });

  it('uma limpeza que lança não impede as outras e o erro aparece', async () => {
    const ordem: number[] = [];
    const fabrica = criarFabrica();
    fabrica.registrar(() => void ordem.push(1));
    fabrica.registrar(() => {
      throw new Error('falha na limpeza');
    });
    fabrica.registrar(() => void ordem.push(3));
    await expect(fabrica.limpar()).rejects.toThrow('falha na limpeza');
    expect(ordem).toEqual([3, 1]);
  });

  it('limpar de novo não repete limpezas', async () => {
    let vezes = 0;
    const fabrica = criarFabrica();
    fabrica.registrar(() => void vezes++);
    await fabrica.limpar();
    await fabrica.limpar();
    expect(vezes).toBe(1);
  });
});
