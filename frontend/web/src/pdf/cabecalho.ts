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

/** Altura da linha de texto (line-height 1,25 do mockup) e posição da linha-base dentro dela. */
export const alturaDaLinhaDeTexto = (tamanho: number): number => tamanho * 1.25;
export const baseNaLinha = (topo: number, tamanho: number): number => topo + tamanho * 1.025;

/** Espessura da barra verde do cabeçalho (3 px do mockup). */
const BARRA_PT = 2.25;

/** Altura do cabeçalho: título, subtítulo, respiro, barra verde e respiro (a mesma conta do desenho). */
export function alturaDoCabecalho(tokens: TokensPdf): number {
  const { fonte, espaco } = tokens;
  return alturaDaLinhaDeTexto(fonte.titulo) + alturaDaLinhaDeTexto(fonte.sub) + espaco.e2 + BARRA_PT + espaco.e3;
}

/**
 * Cabeçalho: nome do grupo em maiúsculas, "Ranking: <mês> de <ano>" e "Gerado em ..." à direita (alinhado
 * à base do subtítulo), com a barra verde embaixo. Devolve o `y` onde a tabela pode começar.
 */
export function desenharCabecalho(doc: jsPDF, tokens: TokensPdf, area: AreaPdf, projecao: ProjecaoPdf): number {
  const { cor, fonte, espaco } = tokens;
  usarFonte(doc, 'tituloExtra', fonte.titulo);
  doc.setTextColor(cor.texto.r, cor.texto.g, cor.texto.b);
  doc.text(projecao.grupo.nome.toUpperCase(), area.x, baseNaLinha(area.y, fonte.titulo));

  const topoSub = area.y + alturaDaLinhaDeTexto(fonte.titulo);
  usarFonte(doc, 'titulo', fonte.sub);
  doc.text(`Ranking: ${mesPorExtenso(projecao.mes)}`, area.x, baseNaLinha(topoSub, fonte.sub));

  const fimTexto = topoSub + alturaDaLinhaDeTexto(fonte.sub);
  usarFonte(doc, 'texto', fonte.pequeno);
  doc.setTextColor(cor.textoSecundario.r, cor.textoSecundario.g, cor.textoSecundario.b);
  const direita = area.x + area.largura;
  const ultima = baseNaLinha(fimTexto - alturaDaLinhaDeTexto(fonte.pequeno), fonte.pequeno);
  const gerado = `Gerado em ${dataHoraCompleta(projecao.geradoEm)}`;
  if (projecao.semPartidasNoMes) {
    doc.text(gerado, direita, ultima - alturaDaLinhaDeTexto(fonte.pequeno), { align: 'right' });
    doc.text(FRASE_MES_VAZIO, direita, ultima, { align: 'right' });
  } else {
    doc.text(gerado, direita, ultima, { align: 'right' });
  }

  const yBarra = fimTexto + espaco.e2 + BARRA_PT / 2;
  doc.setDrawColor(cor.verde.r, cor.verde.g, cor.verde.b);
  doc.setLineWidth(BARRA_PT);
  doc.line(area.x, yBarra, direita, yBarra);
  return yBarra + BARRA_PT / 2 + espaco.e3;
}
