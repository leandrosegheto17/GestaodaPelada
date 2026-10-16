import type { ProjecaoPdf } from '@pelada/contrato';
import type { jsPDF } from 'jspdf';
import { desenharCabecalho, type AreaPdf } from './cabecalho';
import { desenharTabela } from './tabela';
import { tokensPdf, type TokensPdf } from './tokens-pdf';

/** Margens da folha A4: 38 px nos lados e em cima (0,75 pt por px). */
export const MARGEM_PT = 28.5;

/** Altura da linha por fonte de 8,5 pt: 20 px do mockup (15 pt). */
export const ALTURA_LINHA_POR_FONTE = 15 / 8.5;

export interface OpcoesFolha {
  /** Tamanho de fonte das linhas (pt). Padrão: o token `--pdf-texto`. */
  tamanhoFonte?: number;
  /** Altura da linha (pt). Padrão: proporcional ao tamanho da fonte. */
  alturaLinha?: number;
}

export interface ResultadoFolha {
  /** Área útil da folha. */
  area: AreaPdf;
  /** `y` logo abaixo da tabela. */
  fimDaTabela: number;
  tamanhoFonte: number;
  alturaLinha: number;
}

/**
 * Desenha a folha do ranking (cabeçalho e tabela) no documento. Só usa o que veio na projeção: nenhuma
 * soma, ordem ou escolha de coluna acontece aqui. Legenda e rodapé entram depois da tabela.
 */
export function desenharFolha(
  doc: jsPDF,
  projecao: ProjecaoPdf,
  opcoes: OpcoesFolha = {},
  tokens: TokensPdf = tokensPdf(),
): ResultadoFolha {
  const tamanhoFonte = opcoes.tamanhoFonte ?? tokens.fonte.texto;
  const alturaLinha = opcoes.alturaLinha ?? tamanhoFonte * ALTURA_LINHA_POR_FONTE;
  const largura = doc.internal.pageSize.getWidth() - MARGEM_PT * 2;
  const area: AreaPdf = { x: MARGEM_PT, y: MARGEM_PT, largura };
  const yTabela = desenharCabecalho(doc, tokens, area, projecao);
  const fimDaTabela = desenharTabela(doc, tokens, { ...area, y: yTabela }, projecao, { tamanhoFonte, alturaLinha });
  return { area, fimDaTabela, tamanhoFonte, alturaLinha };
}
