import { describe, expect, it } from 'vitest';
import { erroPadrao, habilidadeCorpo, listaHabilidades, notaCorpo, notaSalva } from '../src/index.js';
import { respostas } from './apoio/respostas.js';

describe('respostas do mockup', () => {
  it.each(respostas(/^habilidades.*\.json$/))('$nome passa em listaHabilidades', ({ json }) => {
    expect(listaHabilidades.safeParse(json).success).toBe(true);
  });
  it('nota salva e erro de validação', () => {
    expect(notaSalva.safeParse(respostas(/^jogador-toninho-nota-salva\.json$/)[0]?.json).success).toBe(true);
    const erro = respostas(/^erro-validacao-habilidade\.json$/)[0]?.json;
    expect(erroPadrao.safeParse(erro).success).toBe(true);
    expect(Object.keys((erro as { erro: { campos: object } }).erro.campos)).toContain('nome');
  });
});

describe('habilidadeCorpo', () => {
  it.each([
    [1, false],
    [2, true],
    [30, true],
    [31, false],
  ])('nome com %i caracteres → %s', (n, aceito) => {
    expect(habilidadeCorpo.safeParse({ nome: 'a'.repeat(n) }).success).toBe(aceito);
  });

  it('apara os espaços antes de medir', () => {
    expect(habilidadeCorpo.parse({ nome: '  Passe  ' })).toEqual({ nome: 'Passe' });
    expect(habilidadeCorpo.safeParse({ nome: '     ' }).success).toBe(false);
  });

  it.each([
    { nome: 5 },
    {},
    { nome: 'Passe', id: 'x' },
    { nome: 'Passe', grupoId: 'x' },
    { nome: 'Passe', eDono: true },
  ])('recusa %j', (corpo) => {
    expect(habilidadeCorpo.safeParse(corpo).success).toBe(false);
  });
});

describe('notaCorpo', () => {
  it.each([1, 10, null])('aceita %s', (nota) => {
    expect(notaCorpo.safeParse({ nota }).success).toBe(true);
  });
  it.each([0, 11, 7.5, '7', Number.NaN, undefined])('recusa %s', (nota) => {
    expect(notaCorpo.safeParse({ nota }).success).toBe(false);
  });
  it('corpo vazio e campos extras são recusados', () => {
    expect(notaCorpo.safeParse({}).success).toBe(false);
    expect(notaCorpo.safeParse({ nota: 5, nivel: 9 }).success).toBe(false);
  });
});

describe('notaSalva', () => {
  it('exige o nível e se há nota', () => {
    expect(notaSalva.safeParse({ habilidadeId: 'h', nota: null, nivel: 5 }).success).toBe(false);
    expect(notaSalva.safeParse({ habilidadeId: 'h', nota: null, nivel: 5, semNota: true }).success).toBe(true);
  });
});
