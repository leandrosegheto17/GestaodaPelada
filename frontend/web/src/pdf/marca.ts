import type { ProjecaoPdf } from '@pelada/contrato';
import type { jsPDF } from 'jspdf';
import { formatarPontos } from '../formatacao';
import { ROTULO_SITUACAO_PRESENCA } from '../rotulos';
import { usarFonte } from './fontes-pdf';
import type { CoresSituacao, TokensPdf } from './tokens-pdf';

type Rodada = ProjecaoPdf['linhas'][number]['rodadas'][number];

interface Celula {
  /** Centro da célula. */
  cx: number;
  cy: number;
}

/** Marca da rodada: largura 22 px (16,5 pt) por 15 px (11,25 pt) a 8,5 pt de fonte; cresce e encolhe com a fonte. */
export function medidasDaMarca(tamanhoFonte: number): { largura: number; altura: number; raio: number } {
  const escala = tamanhoFonte / 8.5;
  return { largura: 16.5 * escala, altura: 11.25 * escala, raio: 2.25 * escala };
}

function coresDaSituacao(tokens: TokensPdf, situacao: Rodada['situacao']): CoresSituacao | null {
  switch (situacao) {
    case 'presente':
      return tokens.cor.presente;
    case 'lesionado':
      return tokens.cor.lesionado;
    case 'expulso':
      return tokens.cor.expulso;
    case 'falta':
      return tokens.cor.falta;
    case 'fora':
      return null;
  }
}

/** Letra depois do número: "L" (lesionado) e "E" (expulso), a mesma dos rótulos do app. */
export function sufixoDaSituacao(situacao: Rodada['situacao']): string {
  return situacao === 'lesionado' || situacao === 'expulso' ? ROTULO_SITUACAO_PRESENCA[situacao].letra : '';
}

/**
 * Desenha a rodada numa célula: cor de fundo da situação com o número dos pontos, "L"/"E" depois do número,
 * retângulo tracejado na falta e "–" sem fundo quando o jogador ainda não fazia parte do grupo.
 */
export function desenharMarca(
  doc: jsPDF,
  tokens: TokensPdf,
  celula: Celula,
  rodada: Rodada,
  tamanhoFonte: number,
): void {
  const { largura, altura, raio } = medidasDaMarca(tamanhoFonte);
  const x = celula.cx - largura / 2;
  const y = celula.cy - altura / 2;
  const cores = coresDaSituacao(tokens, rodada.situacao);
  if (cores === null || rodada.pontos === null) {
    usarFonte(doc, 'textoNegrito', tamanhoFonte);
    doc.setTextColor(tokens.cor.textoSecundario.r, tokens.cor.textoSecundario.g, tokens.cor.textoSecundario.b);
    doc.text('–', celula.cx, celula.cy, { align: 'center', baseline: 'middle' });
    return;
  }
  doc.setFillColor(cores.fundo.r, cores.fundo.g, cores.fundo.b);
  doc.roundedRect(x, y, largura, altura, raio, raio, 'F');
  if (rodada.situacao === 'falta') {
    doc.setDrawColor(cores.texto.r, cores.texto.g, cores.texto.b);
    doc.setLineWidth(0.75);
    doc.setLineDashPattern([2, 1.5], 0);
    doc.roundedRect(x, y, largura, altura, raio, raio, 'S');
    doc.setLineDashPattern([], 0);
  }
  usarFonte(doc, 'textoNegrito', tamanhoFonte);
  doc.setTextColor(cores.texto.r, cores.texto.g, cores.texto.b);
  const numero = formatarPontos(rodada.pontos);
  const sufixo = sufixoDaSituacao(rodada.situacao);
  if (sufixo === '') {
    doc.text(numero, celula.cx, celula.cy, { align: 'center', baseline: 'middle' });
    return;
  }
  const larguraNumero = doc.getTextWidth(numero);
  usarFonte(doc, 'textoNegrito', tokens.fonte.mes);
  const larguraSufixo = doc.getTextWidth(sufixo) + 1;
  const inicio = celula.cx - (larguraNumero + larguraSufixo) / 2;
  usarFonte(doc, 'textoNegrito', tamanhoFonte);
  doc.text(numero, inicio, celula.cy, { baseline: 'middle' });
  usarFonte(doc, 'textoNegrito', tokens.fonte.mes);
  doc.text(sufixo, inicio + larguraNumero + 1, celula.cy, { baseline: 'middle' });
}
