import { describe, expect, it, vi } from 'vitest';
import { novoDocumento, projecaoDoMockup } from './apoio-teste';
import { FRASE_MES_VAZIO } from './cabecalho';
import { desenharFolha } from './desenhar-folha';
import { tokensPdf } from './tokens-pdf';

type Doc = Awaited<ReturnType<typeof novoDocumento>>;

/** Registra o que o desenho pede ao documento, sem mudar o resultado. */
function espionar(doc: Doc) {
  const textos: string[] = [];
  const larguraDasLinhas: number[] = [];
  const retangulos: number[] = [];
  const tracejados: unknown[] = [];
  const fundos: string[] = [];

  const texto = doc.text.bind(doc) as (...a: unknown[]) => unknown;
  vi.spyOn(doc, 'text').mockImplementation(((...a: unknown[]) => {
    textos.push(String(a[0]));
    return texto(...a);
  }) as never);

  const linha = doc.line.bind(doc);
  vi.spyOn(doc, 'line').mockImplementation(((...a: Parameters<Doc['line']>) => {
    larguraDasLinhas.push(doc.getLineWidth());
    return linha(...a);
  }) as never);

  const retangulo = doc.roundedRect.bind(doc);
  vi.spyOn(doc, 'roundedRect').mockImplementation(((...a: Parameters<Doc['roundedRect']>) => {
    retangulos.push(1);
    return retangulo(...a);
  }) as never);

  const tracejo = doc.setLineDashPattern.bind(doc);
  vi.spyOn(doc, 'setLineDashPattern').mockImplementation(((...a: Parameters<Doc['setLineDashPattern']>) => {
    if (a[0].length > 0) tracejados.push(a[0]);
    return tracejo(...a);
  }) as never);

  const preenche = doc.setFillColor.bind(doc) as (...x: number[]) => unknown;
  vi.spyOn(doc, 'setFillColor').mockImplementation(((...a: number[]) => {
    fundos.push(a.join(','));
    return preenche(...a);
  }) as never);

  return { textos, larguraDasLinhas, retangulos, tracejados, fundos };
}

describe('desenharFolha', () => {
  it('A4 retrato com cabeçalho, siglas de mês e uma linha por jogador na ordem recebida', async () => {
    const projecao = projecaoDoMockup('publico-pdf-2026-10.json');
    const doc = await novoDocumento();
    const visto = espionar(doc);
    desenharFolha(doc, projecao);
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(841.89, 1);
    expect(visto.textos).toContain('PELADA DE QUINTA');
    expect(visto.textos).toContain('Ranking: outubro de 2026');
    expect(visto.textos).toContain('Gerado em 22/10/2026 18:40');
    expect(visto.textos.filter((t) => ['JUN', 'AGO', 'SET', 'OUT'].includes(t))).toEqual(['JUN', 'AGO', 'SET', 'OUT']);
    const nomes = projecao.linhas.map((l) => l.apelido);
    expect(visto.textos.filter((t) => nomes.includes(t))).toEqual(nomes);
    expect(visto.textos).not.toContain(FRASE_MES_VAZIO);
  });

  it('uma divisa grossa por mês e uma antes de Pts final', async () => {
    const projecao = projecaoDoMockup('publico-pdf-2026-10.json');
    const doc = await novoDocumento();
    const visto = espionar(doc);
    desenharFolha(doc, projecao);
    expect(visto.larguraDasLinhas.filter((l) => l === 2)).toHaveLength(4 + 1);
  });

  it('marcas: cores da situação, "L"/"E" depois do número, falta tracejada e "–" sem retângulo', async () => {
    const tokens = tokensPdf();
    const base = projecaoDoMockup('publico-pdf-2026-10.json');
    const projecao = {
      ...base,
      colunas: base.colunas.slice(0, 5),
      linhas: [
        {
          ...base.linhas[0]!,
          rodadas: [
            { situacao: 'presente' as const, pontos: 1 },
            { situacao: 'lesionado' as const, pontos: 1 },
            { situacao: 'expulso' as const, pontos: -1 },
            { situacao: 'falta' as const, pontos: 0 },
            { situacao: 'fora' as const, pontos: null },
          ],
        },
      ],
    };
    const doc = await novoDocumento();
    const visto = espionar(doc);
    desenharFolha(doc, projecao);
    const rgb = (c: { r: number; g: number; b: number }) => `${c.r},${c.g},${c.b}`;
    expect(visto.fundos).toEqual(
      expect.arrayContaining([
        rgb(tokens.cor.presente.fundo),
        rgb(tokens.cor.lesionado.fundo),
        rgb(tokens.cor.expulso.fundo),
        rgb(tokens.cor.falta.fundo),
      ]),
    );
    expect(visto.textos).toEqual(expect.arrayContaining(['L', 'E', '−1', '–']));
    expect(visto.tracejados).toHaveLength(1);
    // 4 fundos de marca e o contorno tracejado da falta; "fora" não desenha retângulo
    expect(visto.retangulos).toHaveLength(4 + 1);
  });

  it('mês sem partidas: a frase aparece no cabeçalho', async () => {
    const doc = await novoDocumento();
    const visto = espionar(doc);
    desenharFolha(doc, projecaoDoMockup('publico-pdf-2026-07.json'));
    expect(visto.textos).toContain(FRASE_MES_VAZIO);
    expect(visto.textos).toContain('Ranking: julho de 2026');
  });

  it('as fontes Barlow ficam registradas no documento', async () => {
    const doc = await novoDocumento();
    const familias = Object.keys(doc.getFontList());
    expect(familias).toEqual(
      expect.arrayContaining(['Barlow', 'BarlowSemiBold', 'BarlowCondensed', 'BarlowCondensedExtra']),
    );
  });
});
