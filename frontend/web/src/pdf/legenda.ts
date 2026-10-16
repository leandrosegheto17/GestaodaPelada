import type { jsPDF } from 'jspdf';
import type { AreaPdf } from './cabecalho';
import { usarFonte } from './fontes-pdf';
import type { TokensPdf } from './tokens-pdf';

const BASE =
  'Cor = situação; número = pontos da rodada. Verde: presente · amarelo com “L”: lesionado%LESIONADO% · vermelho com “E”: expulso · cinza tracejado: falta · “–”: ainda não fazia parte do grupo · sol: sem chuva · nuvem: com chuva.';

/** Texto da legenda. Com partidas no mês, explica também o "Pts inicial" e que a soma é até hoje. */
export function textoLegenda(semPartidasNoMes: boolean): string {
  if (semPartidasNoMes) {
    return `${BASE.replace('%LESIONADO%', '')} Pts inicial + rodadas = Pts final. Ordem pelos pontos acumulados até hoje.`;
  }
  return `${BASE.replace('%LESIONADO%', ' (foi e não jogou)')} Pts inicial = pontos antes da 1ª coluna; Pts inicial + rodadas = Pts final (acumulado até hoje). Ordem pelos pontos acumulados até hoje.`;
}

/** Linhas da legenda já quebradas para a largura da área, no tamanho de fonte pequeno. */
export function linhasDaLegenda(doc: jsPDF, tokens: TokensPdf, largura: number, semPartidasNoMes: boolean): string[] {
  usarFonte(doc, 'texto', tokens.fonte.pequeno);
  return doc.splitTextToSize(textoLegenda(semPartidasNoMes), largura) as string[];
}

export function alturaDaLegenda(tokens: TokensPdf, linhas: number): number {
  return tokens.espaco.e3 + linhas * tokens.fonte.pequeno * 1.25;
}

/** Desenha a legenda abaixo do `y` dado e devolve o `y` final. */
export function desenharLegenda(
  doc: jsPDF,
  tokens: TokensPdf,
  area: AreaPdf,
  y: number,
  semPartidasNoMes: boolean,
): number {
  const linhas = linhasDaLegenda(doc, tokens, area.largura, semPartidasNoMes);
  usarFonte(doc, 'texto', tokens.fonte.pequeno);
  doc.setTextColor(tokens.cor.textoSecundario.r, tokens.cor.textoSecundario.g, tokens.cor.textoSecundario.b);
  const passo = tokens.fonte.pequeno * 1.25;
  const inicio = y + tokens.espaco.e3 + tokens.fonte.pequeno;
  linhas.forEach((linha, i) => doc.text(linha, area.x, inicio + i * passo));
  return y + alturaDaLegenda(tokens, linhas.length);
}
