import type { ProjecaoPdf } from '@pelada/contrato';
import type { jsPDF } from 'jspdf';
import { diaMes, formatarPontos, siglaMes } from '../formatacao';
import { alturaDaLinhaDeTexto, baseNaLinha, type AreaPdf } from './cabecalho';
import { usarFonte } from './fontes-pdf';
import { desenharIconeTempo } from './icones-tempo';
import { desenharMarca } from './marca';
import type { Rgb, TokensPdf } from './tokens-pdf';

export interface OpcoesTabela {
  tamanhoFonte: number;
  alturaLinha: number;
}

// Medidas (pt) da tabela do mockup: 24, 44,4 e 35,7 px de largura; 44,2 px por coluna de partida.
const LARGURA_NUMERO = 18;
const LARGURA_INICIAL = 33.3;
const LARGURA_FINAL = 26.8;
const NOME_MINIMO = 60;
const COLUNA_MINIMA = 20;
const COLUNA_MAXIMA = 32.6;
const LADO_ICONE = 7.5;
/** Metade da borda da divisa de mês (2 pt). */
const METADE_DIVISA = 1;
/** Linha dos meses (20 px) e linha das datas com o ícone do tempo (24,5 px). */
const ALTURA_MES = 15;
const ALTURA_DATA = 18.375;
/** Respiro à esquerda do nome (3 px). */
const RESPIRO_NOME = 2.25;

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

export interface Medidas {
  x: { numero: number; nome: number; inicial: number; primeiraColuna: number; final: number; fim: number };
  /** Centro do conteúdo de cada coluna de partida. */
  centros: number[];
  /** Divisas: borda esquerda do primeiro dia de cada mês. */
  divisas: number[];
  alturaCabecalho: number;
}

/**
 * Posições horizontais da tabela. Cada divisa de mês tira 1 pt de cada lado da coluna vizinha (metade da
 * borda de 2 pt); a coluna de partida encolhe até o mínimo e o nome fica com o resto.
 */
export function medirTabela(area: AreaPdf, colunas: ProjecaoPdf['colunas']): Medidas {
  const grupos = gruposDeMes(colunas);
  const primeirosDoMes = new Set(grupos.map((g) => g.inicio));
  const ultimosDoMes = new Set(grupos.map((g) => g.inicio + g.quantas - 1));
  const fixas = LARGURA_NUMERO + LARGURA_INICIAL + LARGURA_FINAL;
  const bordas = grupos.length * 2 * METADE_DIVISA;
  const n = colunas.length;
  const disponivel = area.largura - fixas - NOME_MINIMO - bordas;
  const base = n === 0 ? COLUNA_MAXIMA : Math.min(COLUNA_MAXIMA, Math.max(COLUNA_MINIMA, disponivel / n));
  const nome = area.largura - fixas - bordas - base * n;
  const inicioNome = area.x + LARGURA_NUMERO;
  const inicial = inicioNome + nome;
  const primeiraColuna = inicial + LARGURA_INICIAL;
  const centros: number[] = [];
  const divisas: number[] = [];
  let x = primeiraColuna;
  colunas.forEach((_, i) => {
    const esquerda = primeirosDoMes.has(i) ? METADE_DIVISA : 0;
    if (primeirosDoMes.has(i)) divisas.push(x);
    centros.push(x + esquerda + base / 2);
    x += esquerda + base + (ultimosDoMes.has(i) ? METADE_DIVISA : 0);
  });
  return {
    x: { numero: area.x, nome: inicioNome, inicial, primeiraColuna, final: x, fim: x + LARGURA_FINAL },
    centros,
    divisas,
    alturaCabecalho: ALTURA_MES + ALTURA_DATA,
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
  const m = medirTabela(area, projecao.colunas);
  const topo = area.y;
  const baseCabecalho = topo + m.alturaCabecalho;
  const meioCabecalho = topo + m.alturaCabecalho / 2;
  const alturaTexto = alturaDaLinhaDeTexto(fonte.pequeno);

  // Cabeçalho fixo: #, Jogador, Pts inicial e Pts final.
  usarFonte(doc, 'textoNegrito', fonte.pequeno);
  cor(doc, c.textoSecundario);
  doc.text('#', m.x.numero + LARGURA_NUMERO / 2, baseNaLinha(meioCabecalho - alturaTexto / 2, fonte.pequeno), {
    align: 'center',
  });
  doc.text('Jogador', m.x.nome + RESPIRO_NOME, baseNaLinha(meioCabecalho - alturaTexto / 2, fonte.pequeno));
  for (const [x, largura, ...linhas] of [
    [m.x.inicial, LARGURA_INICIAL, 'Pts', 'inicial'],
    [m.x.final, LARGURA_FINAL, 'Pts', 'final'],
  ] as const) {
    const centro = x + largura / 2;
    const primeiraLinha = meioCabecalho - alturaTexto;
    doc.text(linhas[0], centro, baseNaLinha(primeiraLinha, fonte.pequeno), { align: 'center' });
    doc.text(linhas[1], centro, baseNaLinha(primeiraLinha + alturaTexto, fonte.pequeno), { align: 'center' });
  }

  // Siglas de mês sobre o primeiro dia de cada mês e datas com o tempo da partida.
  gruposDeMes(projecao.colunas).forEach((g, gi) => {
    usarFonte(doc, 'textoNegrito', fonte.mes);
    cor(doc, c.textoSecundario);
    doc.text(
      siglaMes(g.mes).toUpperCase(),
      ((m.divisas[gi] ?? 0) + (m.divisas[gi + 1] ?? m.x.final)) / 2,
      baseNaLinha(topo + (ALTURA_MES - alturaDaLinhaDeTexto(fonte.mes)) / 2, fonte.mes),
      { align: 'center' },
    );
  });
  projecao.colunas.forEach((coluna, i) => {
    const centro = m.centros[i] ?? 0;
    usarFonte(doc, 'textoNegrito', fonte.pequeno);
    cor(doc, coluna.doMesExibido ? c.texto : c.textoSecundario);
    const topoData = topo + ALTURA_MES + (ALTURA_DATA - alturaTexto - 0.75 - LADO_ICONE) / 2;
    doc.text(diaMes(coluna.data), centro, baseNaLinha(topoData, fonte.pequeno), { align: 'center' });
    const centroIcone = topoData + alturaTexto + 0.75 + LADO_ICONE / 2;
    desenharIconeTempo(doc, centro, centroIcone, LADO_ICONE, coluna.choveu, coluna.choveu ? c.chuva : c.sol);
  });
  doc.setDrawColor(c.texto.r, c.texto.g, c.texto.b);
  doc.setLineWidth(1);
  doc.line(area.x, baseCabecalho, m.x.fim, baseCabecalho);
  doc.line(m.x.primeiraColuna, topo + ALTURA_MES, m.x.final, topo + ALTURA_MES);

  // Linhas dos jogadores.
  doc.setFillColor(c.zebra.r, c.zebra.g, c.zebra.b);
  for (let i = 1; i < projecao.linhas.length; i += 2) {
    doc.rect(area.x, baseCabecalho + i * alturaLinha, m.x.fim - area.x, alturaLinha, 'F');
  }
  projecao.linhas.forEach((linha, i) => {
    const y = baseCabecalho + i * alturaLinha;
    const centro = y + alturaLinha / 2;
    doc.setDrawColor(c.linha.r, c.linha.g, c.linha.b);
    doc.setLineWidth(0.5);
    doc.line(area.x, y + alturaLinha, m.x.fim, y + alturaLinha);

    usarFonte(doc, 'texto', tamanhoFonte);
    cor(doc, c.texto);
    doc.text(String(linha.posicao), m.x.numero + LARGURA_NUMERO / 2, centro, { align: 'center', baseline: 'middle' });
    usarFonte(doc, 'textoSemi', tamanhoFonte);
    doc.text(
      cortarParaCaber(doc, linha.apelido, m.x.inicial - m.x.nome - 4 - RESPIRO_NOME),
      m.x.nome + RESPIRO_NOME,
      centro,
      {
        baseline: 'middle',
      },
    );
    usarFonte(doc, 'textoNegrito', tamanhoFonte);
    cor(doc, c.textoSecundario);
    doc.text(formatarPontos(linha.ptsInicial), m.x.inicial + LARGURA_INICIAL / 2, centro, {
      align: 'center',
      baseline: 'middle',
    });
    linha.rodadas.forEach((rodada, j) => {
      desenharMarca(doc, tokens, { cx: m.centros[j] ?? 0, cy: centro }, rodada, tamanhoFonte);
    });
    usarFonte(doc, 'tituloExtra', fonte.pontos);
    cor(doc, c.texto);
    doc.text(formatarPontos(linha.ptsFinal), m.x.final + LARGURA_FINAL / 2, centro, {
      align: 'center',
      baseline: 'middle',
    });
  });

  // Divisas: início de cada mês e antes de Pts final.
  const fimTabela = baseCabecalho + projecao.linhas.length * alturaLinha;
  doc.setDrawColor(c.texto.r, c.texto.g, c.texto.b);
  doc.setLineWidth(2);
  const xs = [...m.divisas, m.x.final];
  for (const x of xs) doc.line(x, topo, x, fimTabela);
  return fimTabela;
}
