import { describe, expect, it } from 'vitest';
import { ORDEM_PESOS, ROTULO_PESO } from './pesos';

describe('rótulos dos pesos', () => {
  it('um rótulo para cada peso, na ordem do mockup', () => {
    expect(ORDEM_PESOS.map((c) => ROTULO_PESO[c])).toEqual([
      'Presença sem chuva',
      'Presença com chuva',
      'Lesionado sem chuva',
      'Lesionado com chuva',
      'Expulso',
    ]);
  });
});
