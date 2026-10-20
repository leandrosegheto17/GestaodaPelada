import { ErroLegado } from './tipos.ts';

export interface LinhaTabela {
  /** Número da linha no arquivo, a partir de 1. */
  numero: number;
  celulas: string[];
}

export interface Tabela {
  cabecalho: LinhaTabela;
  linhas: LinhaTabela[];
  /** Último título (`##`, `###` ou `####`) antes da tabela. */
  titulo: string;
}

/** Texto sem acento, em minúsculas e sem espaços nas pontas: para comparar títulos e cabeçalhos. */
export const normalizar = (texto: string): string => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Caractere de controle ou quebra dentro de uma célula torna o arquivo suspeito. */
// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u0008\u000b-\u001f\u007f]/;

export function dividirLinhas(texto: string): string[] {
  return texto.split(/\r?\n/);
}

function celulasDe(linha: string, numero: number): string[] {
  if (CONTROLE.test(linha)) throw new ErroLegado('caractere de controle na linha.', numero);
  const partes = linha.trim().split('|');
  return partes.slice(1, -1).map((c) => c.trim());
}

const ehSeparador = (celulas: string[]): boolean => celulas.length > 0 && celulas.every((c) => /^:?-{1,}:?$/.test(c));

/**
 * Tabelas da seção que começa no título `inicio` e vai até o próximo título de mesmo nível ou
 * superior (`##`). Cada tabela leva o último título que a antecede.
 */
export function tabelasDaSecao(linhas: readonly string[], inicio: (titulo: string) => boolean): Tabela[] {
  const primeira = linhas.findIndex((l) => /^## /.test(l) && inicio(normalizar(l.slice(3))));
  if (primeira < 0) return [];
  const tabelas: Tabela[] = [];
  let titulo = linhas[primeira]!.replace(/^#+\s*/, '');
  let atual: Tabela | null = null;
  let separadorVisto = false;
  for (let i = primeira + 1; i < linhas.length; i++) {
    const linha = linhas[i]!;
    if (/^## /.test(linha)) break;
    if (/^#{3,4} /.test(linha)) {
      titulo = linha.replace(/^#+\s*/, '').trim();
      atual = null;
      continue;
    }
    if (!linha.trim().startsWith('|')) {
      atual = null;
      continue;
    }
    const celulas = celulasDe(linha, i + 1);
    if (!atual) {
      atual = { cabecalho: { numero: i + 1, celulas }, linhas: [], titulo };
      tabelas.push(atual);
      separadorVisto = false;
    } else if (!separadorVisto && ehSeparador(celulas)) {
      separadorVisto = true;
    } else {
      atual.linhas.push({ numero: i + 1, celulas });
    }
  }
  return tabelas;
}

/** Posição da coluna cujo cabeçalho (normalizado) satisfaz `casa`; erro citando a linha se faltar. */
export function colunaDe(tabela: Tabela, nome: string, casa: (cabecalho: string) => boolean): number {
  const indice = tabela.cabecalho.celulas.findIndex((c) => casa(normalizar(c)));
  if (indice < 0) throw new ErroLegado(`coluna "${nome}" não encontrada.`, tabela.cabecalho.numero);
  return indice;
}

/** Célula `indice` da linha, ou erro citando a linha quando a linha é curta demais. */
export function celulaDe(linha: LinhaTabela, indice: number, quantas: number): string {
  if (linha.celulas.length !== quantas) throw new ErroLegado('número de colunas diferente do cabeçalho.', linha.numero);
  return linha.celulas[indice] ?? '';
}

/** Inteiro com sinal opcional; aceita o sinal de menos tipográfico e asteriscos de negrito. */
export function inteiroDe(texto: string): number | null {
  const limpo = texto.replace(/\*/g, '').replace(/−/g, '-').replace(/^\+/, '').trim();
  return /^-?\d+$/.test(limpo) ? Number(limpo) : null;
}
