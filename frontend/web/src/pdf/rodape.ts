import type { jsPDF } from 'jspdf';
import type { AreaPdf } from './cabecalho';
import { usarFonte } from './fontes-pdf';
import type { TokensPdf } from './tokens-pdf';

export const NOME_DO_APP = 'Gestão da Pelada';

/** Margem de baixo da folha: 30 px do mockup (22,5 pt). */
export const MARGEM_INFERIOR_PT = 22.5;

/** Altura do rodapé: filete, respiro e uma linha de texto. */
export function alturaDoRodape(tokens: TokensPdf): number {
  return tokens.espaco.e2 + tokens.fonte.rodape * 1.25;
}

/** Endereço para ler: o `urlPublica` da API sem o esquema (o texto só é mostrado, nunca montado aqui). */
export function enderecoParaLer(urlPublica: string): string {
  return urlPublica.replace(/^https?:\/\//, '');
}

/** Rodapé no pé da folha: "Gestão da Pelada" à esquerda e o endereço público à direita. */
export function desenharRodape(doc: jsPDF, tokens: TokensPdf, area: AreaPdf, urlPublica: string): void {
  const altura = doc.internal.pageSize.getHeight();
  const topo = altura - MARGEM_INFERIOR_PT - alturaDoRodape(tokens);
  doc.setDrawColor(tokens.cor.linha.r, tokens.cor.linha.g, tokens.cor.linha.b);
  doc.setLineWidth(0.5);
  doc.line(area.x, topo, area.x + area.largura, topo);
  usarFonte(doc, 'texto', tokens.fonte.rodape);
  doc.setTextColor(tokens.cor.textoSecundario.r, tokens.cor.textoSecundario.g, tokens.cor.textoSecundario.b);
  const base = topo + tokens.espaco.e2 + tokens.fonte.rodape;
  doc.text(NOME_DO_APP, area.x, base);
  doc.text(enderecoParaLer(urlPublica), area.x + area.largura, base, { align: 'right' });
}
