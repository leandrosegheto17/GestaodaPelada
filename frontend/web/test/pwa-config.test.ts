import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { criarManifesto, criarOpcoesPwa } from '../config/manifesto';
import { lerToken } from '../config/tokens';

const RAIZ = join(import.meta.dirname, '..');
const MOCKUP = join(RAIZ, '../../.md/mockup');
const tokens = readFileSync(join(RAIZ, 'src/estilos/tokens.css'), 'utf8');

describe('manifesto do PWA', () => {
  const manifesto = criarManifesto();

  it('é um app instalável em modo standalone, em português', () => {
    expect(manifesto.display).toBe('standalone');
    expect(manifesto.lang).toBe('pt-BR');
    expect(manifesto.start_url).toBe('/');
    expect(manifesto.scope).toBe('/');
    expect(manifesto.name).toBe('Gestão da Pelada');
    expect(manifesto.short_name).toBe('Pelada');
  });

  it('as cores vêm dos tokens', () => {
    expect(manifesto.theme_color).toBe(lerToken(tokens, '--cor-verde'));
    expect(manifesto.background_color).toBe(lerToken(tokens, '--cor-fundo'));
  });

  it('3 ícones com tamanhos e propósitos corretos', () => {
    expect(manifesto.icons).toEqual([
      { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icones/icone-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]);
  });

  it('os arquivos de ícone são os do mockup, byte a byte', () => {
    for (const nome of readdirSync(join(RAIZ, 'public/icones'))) {
      expect(readFileSync(join(RAIZ, 'public/icones', nome)).equals(readFileSync(join(MOCKUP, 'icones', nome)))).toBe(
        true,
      );
    }
    expect(readdirSync(join(RAIZ, 'public/icones')).sort()).toEqual([
      'apple-touch-180.png',
      'icone-192.png',
      'icone-512-maskable.png',
      'icone-512.png',
    ]);
  });
});

describe('opções do plugin', () => {
  it('service worker próprio, atualização por aviso e sem registro inline', () => {
    const opcoes = criarOpcoesPwa();
    expect(opcoes.strategies).toBe('injectManifest');
    expect(opcoes.filename).toBe('sw.ts');
    expect(opcoes.registerType).toBe('prompt');
    expect(opcoes.injectRegister).toBe(false);
    expect(opcoes.injectManifest?.globPatterns).toEqual(['**/*.{html,js,css,woff2,png,svg,webmanifest}']);
  });
});

describe('lerToken', () => {
  it('ignora comentários e falha para token inexistente', () => {
    expect(lerToken('/* --cor-x:#000; */ :root{ --cor-x: #123456; }', '--cor-x')).toBe('#123456');
    expect(() => lerToken(':root{}', '--cor-y')).toThrow();
  });
});

describe('sw.ts', () => {
  const sw = readFileSync(join(RAIZ, 'src/pwa/sw.ts'), 'utf8');

  it('só o ranking público tem rota de cache; nenhum outro /api/ é citado', () => {
    expect(sw.match(/registerRoute\(/g)).toHaveLength(3);
    expect(sw).not.toMatch(/api\/(grupos|dono|publico\/[^'"]*pdf)/);
    expect(sw).toContain('networkTimeoutSeconds: 3');
    expect(sw).toContain('statuses: [200]');
  });

  it('não usa eval nem redireciona para o endereço novo', () => {
    expect(sw).not.toMatch(/\beval\(|new Function|location\.href\s*=|Response\.redirect/);
  });
});
