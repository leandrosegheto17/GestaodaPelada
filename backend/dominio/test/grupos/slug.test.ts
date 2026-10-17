import { describe, expect, it } from 'vitest';
import { gerarSlug, slugBase } from '../../src/index.js';

const vazio = new Set<string>();

describe('slugBase', () => {
  it.each([
    ['Pelada de Quinta', 'pelada-de-quinta'],
    ['Racha de Domingo', 'racha-de-domingo'],
    ['Pelada do Leandro', 'pelada-do-leandro'],
    ['Fúria São João Ação', 'furia-sao-joao-acao'],
    ['⚽ Pelada 🔥!!', 'pelada'],
    ['  --Futebol__Amigos--  ', 'futebol-amigos'],
    ['Time 2026', 'time-2026'],
    ['⚽🔥!!!', 'grupo'],
    ['', 'grupo'],
    ['   ', 'grupo'],
    ['Пелада', 'grupo'],
    ['足球', 'grupo'],
    ['ab', 'grupo'],
    ['../etc/passwd', 'etc-passwd'],
    ['%2F%2e%2e', '2f-2e-2e'],
    ['Pe​la​da', 'pe-la-da'],
    ['API', 'api-grupo'],
    ['Admin', 'admin-grupo'],
    ['g', 'grupo'],
    ['Privacidade', 'privacidade-grupo'],
    ['--x--', 'grupo'],
    ['​​', 'grupo'],
    ['%2F..%2Fx', '2f-2fx'],
    ['Pe​lada', 'pe-lada'],
  ])('%j → %s', (nome, esperado) => {
    expect(slugBase(nome)).toBe(esperado);
  });

  it('corta em 40 sem terminar em hífen', () => {
    expect(slugBase(`${'a'.repeat(39)} bbbbbbbbbb`)).toBe('a'.repeat(39));
    expect(slugBase('a'.repeat(100))).toHaveLength(40);
  });

  it('corta no limite sem deixar hífen no fim', () => {
    const nome = `${'a'.repeat(39)} bbbbbbbbbbbbbbbbbbbb`;
    const slug = slugBase(nome);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('a saída sempre casa com o formato público', () => {
    const pedacos = ['Pelada', 'ção', '⚽', ' ', '--', 'Zé', '_', 'A1', '日本', 'ñ'];
    for (let i = 0; i < 200; i++) {
      const nome = Array.from({ length: 1 + (i % 8) }, (_, k) => pedacos[(i * 7 + k * 3) % pedacos.length]).join('');
      const slug = slugBase(nome);
      expect(slug).toMatch(/^[a-z0-9-]{1,64}$/);
      expect(slug).not.toContain('--');
      expect(slug.startsWith('-') || slug.endsWith('-')).toBe(false);
    }
  });
});

describe('gerarSlug', () => {
  it('conjunto vazio devolve a base', () => {
    expect(gerarSlug('Pelada de Quinta', vazio)).toBe('pelada-de-quinta');
  });
  it('colisão acrescenta o primeiro sufixo livre', () => {
    expect(gerarSlug('Pelada', new Set(['pelada']))).toBe('pelada-2');
    expect(gerarSlug('Pelada', new Set(['pelada', 'pelada-2', 'pelada-3']))).toBe('pelada-4');
    expect(gerarSlug('⚽🔥', new Set(['grupo']))).toBe('grupo-2');
  });
  it('slug de grupo arquivado conta como usado', () => {
    expect(gerarSlug('Racha', new Set(['racha']))).toBe('racha-2');
  });
  it('base mais sufixo cabe nos 64 caracteres', () => {
    const longo = 'x'.repeat(100);
    const slug = gerarSlug(longo, new Set([slugBase(longo)]));
    expect(slug.length).toBeLessThanOrEqual(64);
  });
  it('preenche lacuna no sufixo', () => {
    expect(gerarSlug('Pelada', new Set(['pelada', 'pelada-3']))).toBe('pelada-2');
  });
  it('1000 colisões chegam a -1000 dentro do formato', () => {
    const longo = 'a'.repeat(40);
    const usados = new Set([longo]);
    for (let n = 2; n < 1000; n++) usados.add(`${longo}-${n}`);
    const slug = gerarSlug(longo, usados);
    expect(slug).toBe(`${longo}-1000`);
    expect(slug).toMatch(/^[a-z0-9-]{1,64}$/);
  });
  it('propriedade: saída de gerarSlug sempre válida em nomes variados', () => {
    const pecas = ['Fúria', 'São', '⚽', ' ', '--', 'Ação', '🔥', 'x', '2026', '__', 'Пел', 'ç', '/', '.'];
    let semente = 7;
    const prox = () => (semente = (semente * 1103515245 + 12345) % 2147483648);
    for (let i = 0; i < 200; i++) {
      let nome = '';
      const n = (prox() % 12) + 1;
      for (let k = 0; k < n; k++) nome += pecas[prox() % pecas.length];
      const s = gerarSlug(nome, new Set(['grupo', 'x']));
      expect(s).toMatch(/^[a-z0-9-]{1,64}$/);
      expect(s).not.toContain('--');
      expect(s.startsWith('-') || s.endsWith('-')).toBe(false);
    }
  });
});
