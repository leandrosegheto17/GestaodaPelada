import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hexParaRgb, lerVariaveis, tokensPdf } from './tokens-pdf';

const css = readFileSync(join(import.meta.dirname, '../estilos/tokens.css'), 'utf8');

describe('tokensPdf', () => {
  it('converte as cores e as medidas do tokens.css', () => {
    const t = tokensPdf();
    expect(t.cor.presente.fundo).toEqual(hexParaRgb('#D7F0DF'));
    expect(t.cor.lesionado.texto).toEqual(hexParaRgb('#6B4A00'));
    expect(t.cor.expulso.fundo).toEqual(hexParaRgb('#FBD9D9'));
    expect(t.cor.falta.texto).toEqual(hexParaRgb('#4A5A50'));
    expect(t.cor.verde).toEqual({ r: 0x0b, g: 0x6b, b: 0x34 });
    expect(t.fonte).toEqual({ titulo: 20, sub: 12, pontos: 10, texto: 8.5, pequeno: 7.5, rodape: 7, mes: 7 });
    expect(t.espaco.e2).toBeCloseTo(6, 5);
    expect(t.espaco.e3).toBeCloseTo(9, 5);
  });

  it('lê as variáveis do arquivo, ignorando comentários', () => {
    expect(lerVariaveis(css).get('--cor-texto')).toBe('#14201A');
  });

  it('variável ausente ou fora do formato é erro explícito', () => {
    expect(() => tokensPdf(':root{ --cor-texto:#000000; }')).toThrow(/Token ausente/);
    expect(() => tokensPdf(css.replace('--pdf-titulo:20pt', '--pdf-titulo:20px'))).toThrow(/em pt/);
    expect(() => hexParaRgb('vermelho')).toThrow(/Cor inválida/);
  });
});
