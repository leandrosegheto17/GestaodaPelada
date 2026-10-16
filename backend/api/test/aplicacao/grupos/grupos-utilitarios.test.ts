import { describe, expect, it } from 'vitest';
import { indiceDiaSemana } from '../../../src/aplicacao/grupos/dia-semana.js';
import { urlPublicaDoGrupo } from '../../../src/aplicacao/grupos/url-publica.js';

describe('indiceDiaSemana', () => {
  it.each([
    ['domingo', 0],
    ['segunda', 1],
    ['terca', 2],
    ['quarta', 3],
    ['quinta', 4],
    ['sexta', 5],
    ['sabado', 6],
  ] as const)('%s → %i', (dia, indice) => {
    expect(indiceDiaSemana(dia)).toBe(indice);
  });
});

describe('urlPublicaDoGrupo', () => {
  it('não duplica a barra', () => {
    expect(urlPublicaDoGrupo('https://app.exemplo.dev', 'pelada')).toBe('https://app.exemplo.dev/g/pelada');
    expect(urlPublicaDoGrupo('https://app.exemplo.dev/', 'pelada')).toBe('https://app.exemplo.dev/g/pelada');
  });
});
