import { describe, expect, it } from 'vitest';
import { gerarSlug, slugBase } from './slug.js';

const FORMATO = /^[a-z0-9-]{1,64}$/;

describe('slugBase', () => {
  it.each([
    ['Pelada de Quinta', 'pelada-de-quinta'],
    ['Racha de Domingo', 'racha-de-domingo'],
    ['Pelada do Leandro', 'pelada-do-leandro'],
    ['Fúria São João Ação', 'furia-sao-joao-acao'],
    ['⚽ Pelada 🔥!!', 'pelada'],
    ['  --Futebol__Amigos--  ', 'futebol-amigos'],
    ['Time 2026', 'time-2026'],
  ])('%s -> %s', (nome, esperado) => {
    expect(slugBase(nome)).toBe(esperado);
  });

  it.each(['', '   ', '⚽🔥!!!', 'Пелада', '足球', '​​', 'ab', '--x--'])(
    'sem base aproveitável (%j) -> grupo',
    (nome) => {
      expect(slugBase(nome)).toBe('grupo');
    },
  );

  it('neutraliza caminho, percent-encoding e largura zero', () => {
    expect(slugBase('../etc/passwd')).toBe('etc-passwd');
    expect(slugBase('%2F..%2Fx')).toBe('2f-2fx');
    expect(slugBase('Pe​lada')).toBe('pe-lada');
  });

  it('corta em 40 sem terminar em hífen', () => {
    const nome = `${'a'.repeat(39)} bbbbbbbbbb`;
    const s = slugBase(nome);
    expect(s).toBe('a'.repeat(39));
    expect(s.endsWith('-')).toBe(false);
    expect(slugBase('a'.repeat(100))).toHaveLength(40);
  });

  it.each([
    ['API', 'api-grupo'],
    ['Admin', 'admin-grupo'],
    ['Privacidade', 'privacidade-grupo'],
  ])('palavra reservada %s -> %s', (nome, esperado) => {
    expect(slugBase(nome)).toBe(esperado);
  });
});

describe('gerarSlug', () => {
  it('conjunto vazio devolve a base', () => {
    expect(gerarSlug('Pelada', new Set())).toBe('pelada');
  });

  it('colisão com grupo -> grupo-2', () => {
    expect(gerarSlug('⚽🔥', new Set(['grupo']))).toBe('grupo-2');
  });

  it('colisão em cadeia, inclusive slug arquivado', () => {
    const usados = new Set(['pelada', 'pelada-2', 'pelada-3']);
    expect(gerarSlug('Pelada', usados)).toBe('pelada-4');
  });

  it('preenche lacuna e cabe nos 64 do contrato', () => {
    expect(gerarSlug('Pelada', new Set(['pelada', 'pelada-3']))).toBe('pelada-2');
    const longo = 'a'.repeat(40);
    const usados = new Set([longo]);
    for (let n = 2; n < 1000; n++) usados.add(`${longo}-${n}`);
    expect(gerarSlug(longo, usados)).toBe(`${longo}-1000`);
    expect(FORMATO.test(gerarSlug(longo, usados))).toBe(true);
  });

  it('propriedade: saída sempre válida em nomes variados', () => {
    const pecas = ['Fúria', 'São', '⚽', ' ', '--', 'Ação', '🔥', 'x', '2026', '__', 'Пел', 'ç', '/', '.'];
    let semente = 7;
    const prox = () => (semente = (semente * 1103515245 + 12345) % 2147483648);
    for (let i = 0; i < 200; i++) {
      let nome = '';
      const n = (prox() % 12) + 1;
      for (let k = 0; k < n; k++) nome += pecas[prox() % pecas.length];
      const s = gerarSlug(nome, new Set(['grupo', 'x']));
      expect(s).toMatch(FORMATO);
      expect(s).not.toContain('--');
      expect(s.startsWith('-') || s.endsWith('-')).toBe(false);
    }
  });
});
