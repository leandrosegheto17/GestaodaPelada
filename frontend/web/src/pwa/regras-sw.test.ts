import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ehApi, ehRankingPublico, enderecoNovoDe, servirShell } from './regras-sw';

const ORIGEM = 'https:' + '//app.exemplo.invalid';
const OUTRA = 'https:' + '//outro.exemplo.invalid';
const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');
const fixture = (nome: string): unknown => JSON.parse(readFileSync(join(RESPOSTAS, nome), 'utf8'));

const url = (caminho: string, origem = ORIGEM) => new URL(caminho, origem);

describe('ehRankingPublico', () => {
  it.each(['/api/publico/pelada-de-quinta/ranking', '/api/publico/pelada-de-quinta/ranking?mes=2026-10'])(
    'cacheia %s',
    (caminho) => {
      expect(ehRankingPublico(url(caminho), ORIGEM)).toBe(true);
    },
  );

  it.each([
    '/api/publico/x/pdf',
    '/api/publico/x/eventos',
    '/api/publico/x/ranking/extra',
    '/api/grupos/g-quinta',
    '/api/sessao/eu',
    '/api/publico/X%2F/ranking',
    '/api/publico/X/ranking',
    '/apiX/publico/x/ranking',
    '/api/publico//ranking',
  ])('não cacheia %s', (caminho) => {
    expect(ehRankingPublico(url(caminho), ORIGEM)).toBe(false);
  });

  it('outra origem com o mesmo caminho não cacheia', () => {
    expect(ehRankingPublico(url('/api/publico/x/ranking', OUTRA), ORIGEM)).toBe(false);
  });
});

describe('ehApi', () => {
  it('só /api na mesma origem', () => {
    expect(ehApi(url('/api/sessao/eu'), ORIGEM)).toBe(true);
    expect(ehApi(url('/api'), ORIGEM)).toBe(true);
    expect(ehApi(url('/apiX'), ORIGEM)).toBe(false);
    expect(ehApi(url('/api/x', OUTRA), ORIGEM)).toBe(false);
  });
});

describe('enderecoNovoDe', () => {
  it('ligado com endereço novo; desligado nos outros casos', () => {
    expect(enderecoNovoDe(fixture('publico-ranking-endereco-novo.json'))).toBe(true);
    expect(enderecoNovoDe(fixture('sessao-eu-endereco-novo.json'))).toBe(true);
    expect(enderecoNovoDe(fixture('publico-ranking-2026-10.json'))).toBe(false);
    expect(enderecoNovoDe(fixture('sessao-eu-admin.json'))).toBe(false);
  });

  it.each([null, undefined, 5, 'texto', [], { enderecoNovo: '' }, { enderecoNovo: 5 }])('%j → desligado', (json) => {
    expect(enderecoNovoDe(json)).toBe(false);
  });
});

describe('servirShell', () => {
  it('a saída de emergência desliga o shell', () => {
    expect(servirShell(false)).toBe(true);
    expect(servirShell(true)).toBe(false);
  });
});
