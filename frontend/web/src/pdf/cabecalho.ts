import type { ProjecaoPdf } from '@pelada/contrato';
import type { jsPDF } from 'jspdf';
import { dataHoraCompleta, mesPorExtenso } from '../formatacao';
import { usarFonte } from './fontes-pdf';
import type { TokensPdf } from './tokens-pdf';

export interface AreaPdf {
  x: number;
  y: number;
  largura: number;
}

/** Frase do cabeçalho quando o mês exibido não tem partidas. */
export const FRASE_MES_VAZIO = 'Nenhuma partida registrada neste mês';

/** Altura do cabeçalho: título, subtítulo, barra verde e respiro (a mesma conta do desenho). */
export function alturaDoCabecalho(tokens: TokensPdf): number {
  const { fonte, espaco } = tokens;
  return fonte.titulo * 0.85 + fonte.sub * 1.15 + espaco.e2 + espaco.e3;
}

/**
 * Cabeçalho: nome do grupo em maiúsculas, "Ranking: <mês> de <ano>" e "Gerado em ..." à direita, com a
 * barra verde embaixo. Devolve o `y` onde a tabela pode começar.
 */
export function desenharCabecalho(doc: jsPDF, tokens: TokensPdf, area: AreaPdf, projecao: ProjecaoPdf): number {
  const { cor, fonte, espaco } = tokens;
  usarFonte(doc, 'tituloExtra', fonte.titulo);
  doc.setTextColor(cor.texto.r, cor.texto.g, cor.texto.b);
  const baseTitulo = area.y + fonte.titulo * 0.85;
  doc.text(projecao.grupo.nome.toUpperCase(), area.x, baseTitulo);

  usarFonte(doc, 'titulo', fonte.sub);
  const baseSub = baseTitulo + fonte.sub * 1.15;
  doc.text(`Ranking: ${mesPorExtenso(projecao.mes)}`, area.x, baseSub);

  usarFonte(doc, 'texto', fonte.pequeno);
  doc.setTextColor(cor.textoSecundario.r, cor.textoSecundario.g, cor.textoSecundario.b);
  const direita = area.x + area.largura;
  doc.text(`Gerado em ${dataHoraCompleta(projecao.geradoEm)}`, direita, baseSub - fonte.pequeno * 1.25, {
    align: 'right',
  });
  if (projecao.semPartidasNoMes) doc.text(FRASE_MES_VAZIO, direita, baseSub, { align: 'right' });

  const yBarra = baseSub + espaco.e2;
  doc.setDrawColor(cor.verde.r, cor.verde.g, cor.verde.b);
  doc.setLineWidth(2.25);
  doc.line(area.x, yBarra, direita, yBarra);
  return yBarra + espaco.e3;
}
