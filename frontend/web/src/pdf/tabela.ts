import type { ProjecaoPdf } from '@pelada/contrato';
import type { jsPDF } from 'jspdf';
import { diaMes, formatarPontos, siglaMes } from '../formatacao';
import type { AreaPdf } from './cabecalho';
import { usarFonte } from './fontes-pdf';
import { desenharIconeTempo } from './icones-tempo';
import { desenharMarca } from './marca';
import type { Rgb, TokensPdf } from './tokens-pdf';

export interface OpcoesTabela {
  tamanhoFonte: number;
  alturaLinha: number;
}

const LARGURA_NUMERO = 20;
const LARGURA_PONTOS = 34;
const NOME_MINIMO = 92;
const COLUNA_MINIMA = 20;
const COLUNA_MAXIMA = 34;
const LADO_ICONE = 7.5;

export interface Medidas {
  x: { numero: number; nome: number; inicial: number; primeiraColuna: number; final: number; fim: number };
  colunas: number;
  larguraColuna: number;
  alturaCabecalho: number;
}

/** Posições horizontais da tabela: a coluna de partida encolhe até o mínimo e o nome fica com o resto. */
export function medirTabela(area: AreaPdf, nColunas: number, tokens: TokensPdf): Medidas {
  const fixas = LARGURA_NUMERO + LARGURA_PONTOS * 2;
  const disponivel = area.largura - fixas - NOME_MINIMO;
  const larguraColuna =
    nColunas === 0 ? COLUNA_MAXIMA : Math.min(COLUNA_MAXIMA, Math.max(COLUNA_MINIMA, disponivel / nColunas));
  const nome = area.largura - fixas - larguraColuna * nColunas;
  const inicioNome = area.x + LARGURA_NUMERO;
  const inicial = inicioNome + nome;
  const primeiraColuna = inicial + LARGURA_PONTOS;
  const final = primeiraColuna + larguraColuna * nColunas;
  return {
    x: { numero: area.x, nome: inicioNome, inicial, primeiraColuna, final, fim: final + LARGURA_PONTOS },
    colunas: nColunas,
    larguraColuna,
    alturaCabecalho: tokens.fonte.mes * 1.6 + tokens.fonte.pequeno * 1.3 + LADO_ICONE + 3,
  };
}

function cor(doc: jsPDF, c: Rgb): void {
  doc.setTextColor(c.r, c.g, c.b);
}

function cortarParaCaber(doc: jsPDF, texto: string, largura: number): string {
  if (doc.getTextWidth(texto) <= largura) return texto;
  let corte = texto;
  while (corte.length > 1 && doc.getTextWidth(`${corte}…`) > largura) corte = corte.slice(0, -1);
  return `${corte.trimEnd()}…`;
}

/** Grupos de colunas seguidas do mesmo mês: `[primeiraColuna, quantidade, mês]`. */
function gruposDeMes(colunas: ProjecaoPdf['colunas']): { inicio: number; quantas: number; mes: string }[] {
  const grupos: { inicio: number; quantas: number; mes: string }[] = [];
  colunas.forEach((c, i) => {
    const mes = c.data.slice(0, 7);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.mes === mes) ultimo.quantas += 1;
    else grupos.push({ inicio: i, quantas: 1, mes });
  });
  return grupos;
}

/**
 * Desenha só o que veio na projeção: cabeçalho de colunas (mês, data, sol/nuvem), uma linha por jogador na
 * ordem recebida, marcas das rodadas e as divisas entre meses. Devolve o `y` logo abaixo da tabela.
 */
export function desenharTabela(
  doc: jsPDF,
  tokens: TokensPdf,
  area: AreaPdf,
  projecao: ProjecaoPdf,
  { tamanhoFonte, alturaLinha }: OpcoesTabela,
): number {
  const { cor: c, fonte } = tokens;
  const m = medirTabela(area, projecao.colunas.length, tokens);
  const topo = area.y;
  const baseCabecalho = topo + m.alturaCabecalho;
  const meioCabecalho = topo + m.alturaCabecalho / 2;
  const xColuna = (i: number) => m.x.primeiraColuna + i * m.larguraColuna;

  // Cabeçalho fixo: #, Jogador, Pts inicial e Pts final.
  usarFonte(doc, 'textoNegrito', fonte.pequeno);
  cor(doc, c.textoSecundario);
  doc.text('#', m.x.numero + LARGURA_NUMERO / 2, meioCabecalho, { align: 'center', baseline: 'middle' });
  doc.text('Jogador', m.x.nome, meioCabecalho, { baseline: 'middle' });
  for (const [x, ...linhas] of [
    [m.x.inicial, 'Pts', 'inicial'],
    [m.x.final, 'Pts', 'final'],
  ] as const) {
    const centro = x + LARGURA_PONTOS / 2;
    doc.text(linhas[0], centro, meioCabecalho - fonte.pequeno * 0.55, { align: 'center', baseline: 'middle' });
    doc.text(linhas[1], centro, meioCabecalho + fonte.pequeno * 0.55, { align: 'center', baseline: 'middle' });
  }

  // Siglas de mês sobre o primeiro dia de cada mês e datas com o tempo da partida.
  const alturaMes = fonte.mes * 1.6;
  for (const g of gruposDeMes(projecao.colunas)) {
    usarFonte(doc, 'texto', fonte.mes);
    cor(doc, c.textoSecundario);
    doc.text(
      siglaMes(g.mes).toUpperCase(),
      xColuna(g.inicio) + (g.quantas * m.larguraColuna) / 2,
      topo + alturaMes / 2,
      {
        align: 'center',
        baseline: 'middle',
      },
    );
  }
  projecao.colunas.forEach((coluna, i) => {
    const centro = xColuna(i) + m.larguraColuna / 2;
    usarFonte(doc, 'textoNegrito', fonte.pequeno);
    cor(doc, coluna.doMesExibido ? c.texto : c.textoSecundario);
    doc.text(diaMes(coluna.data), centro, topo + alturaMes + fonte.pequeno * 0.7, {
      align: 'center',
      baseline: 'middle',
    });
    desenharIconeTempo(doc, centro, baseCabecalho - LADO_ICONE / 2 - 1, LADO_ICONE, coluna.choveu, c.textoSecundario);
  });
  doc.setDrawColor(c.texto.r, c.texto.g, c.texto.b);
  doc.setLineWidth(1);
  doc.line(area.x, baseCabecalho, m.x.fim, baseCabecalho);

  // Linhas dos jogadores.
  projecao.linhas.forEach((linha, i) => {
    const y = baseCabecalho + i * alturaLinha;
    const centro = y + alturaLinha / 2;
    if (i % 2 === 1) {
      doc.setFillColor(c.zebra.r, c.zebra.g, c.zebra.b);
      doc.rect(area.x, y, m.x.fim - area.x, alturaLinha, 'F');
    }
    doc.setDrawColor(c.linha.r, c.linha.g, c.linha.b);
    doc.setLineWidth(0.5);
    doc.line(area.x, y + alturaLinha, m.x.fim, y + alturaLinha);

    usarFonte(doc, 'texto', tamanhoFonte);
    cor(doc, c.texto);
    doc.text(String(linha.posicao), m.x.numero + LARGURA_NUMERO / 2, centro, { align: 'center', baseline: 'middle' });
    usarFonte(doc, 'textoSemi', tamanhoFonte);
    doc.text(cortarParaCaber(doc, linha.apelido, m.x.inicial - m.x.nome - 4), m.x.nome, centro, { baseline: 'middle' });
    usarFonte(doc, 'textoNegrito', tamanhoFonte);
    cor(doc, c.textoSecundario);
    doc.text(formatarPontos(linha.ptsInicial), m.x.inicial + LARGURA_PONTOS / 2, centro, {
      align: 'center',
      baseline: 'middle',
    });
    linha.rodadas.forEach((rodada, j) => {
      desenharMarca(doc, tokens, { cx: xColuna(j) + m.larguraColuna / 2, cy: centro }, rodada, tamanhoFonte);
    });
    usarFonte(doc, 'tituloExtra', fonte.pontos);
    cor(doc, c.texto);
    doc.text(formatarPontos(linha.ptsFinal), m.x.final + LARGURA_PONTOS / 2, centro, {
      align: 'center',
      baseline: 'middle',
    });
  });

  // Divisas: início de cada mês e antes de Pts final.
  const fimTabela = baseCabecalho + projecao.linhas.length * alturaLinha;
  doc.setDrawColor(c.texto.r, c.texto.g, c.texto.b);
  doc.setLineWidth(2);
  const xs = [...gruposDeMes(projecao.colunas).map((g) => xColuna(g.inicio)), m.x.final];
  for (const x of xs) doc.line(x, topo, x, fimTabela);
  return fimTabela;
}
