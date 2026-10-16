import { describe, expect, it } from 'vitest';
import { estadoRetorno, lerRetorno } from './retorno';

describe('retorno', () => {
  it('ida e volta de um recado válido', () => {
    const estado = estadoRetorno({ tipo: 'partida-salva', data: '2026-10-22' });
    expect(lerRetorno(estado)).toEqual({ tipo: 'partida-salva', data: '2026-10-22' });
    expect(lerRetorno(estadoRetorno({ tipo: 'escalacao-confirmada', data: '2026-10-29' }))?.tipo).toBe(
      'escalacao-confirmada',
    );
  });

  it.each([
    null,
    undefined,
    'texto',
    5,
    {},
    { retorno: null },
    { retorno: { tipo: 'outra-coisa', data: '2026-10-22' } },
    { retorno: { tipo: 'partida-salva', data: '22/10/2026' } },
    { retorno: { tipo: 'partida-salva', data: '<img src=x onerror=alert(1)>' } },
    { retorno: { tipo: 'partida-salva' } },
  ])('estado estranho %j vira null', (estado) => {
    expect(lerRetorno(estado)).toBeNull();
  });
});
