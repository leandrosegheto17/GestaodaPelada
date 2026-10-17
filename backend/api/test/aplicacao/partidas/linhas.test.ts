import { describe, expect, it } from 'vitest';
import { montarLinhas } from '../../../src/aplicacao/partidas/linhas.js';

describe('montarLinhas', () => {
  it('ordena por apelido ignorando acento e caixa; sem presença vira ausente', () => {
    const linhas = montarLinhas(
      [
        { id: '3', apelido: 'Zeca' },
        { id: '1', apelido: 'beto' },
        { id: '2', apelido: 'Álvaro' },
      ],
      new Map([['1', 'presente' as const]]),
    );
    expect(linhas).toEqual([
      { id: '2', apelido: 'Álvaro', situacao: 'ausente' },
      { id: '1', apelido: 'beto', situacao: 'presente' },
      { id: '3', apelido: 'Zeca', situacao: 'ausente' },
    ]);
  });

  it('lista vazia gera lista vazia e não altera a entrada', () => {
    const entrada = [{ id: '1', apelido: 'B' }, { id: '2', apelido: 'A' }];
    expect(montarLinhas([], new Map())).toEqual([]);
    montarLinhas(entrada, new Map());
    expect(entrada.map((j) => j.id)).toEqual(['1', '2']);
  });
});
