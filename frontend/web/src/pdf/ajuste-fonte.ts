import { ALTURA_LINHA_POR_FONTE } from './desenhar-folha';

export interface EntradaAjuste {
  /** Jogadores a desenhar. */
  linhas: number;
  /** Altura (pt) que sobra para as linhas, depois de cabeçalho, cabeçalho da tabela, legenda e rodapé. */
  alturaDisponivel: number;
  /** Maior tamanho de fonte (pt): o do token `--pdf-texto`. */
  teto: number;
  /** Menor tamanho aceito (pt). */
  piso?: number;
  passo?: number;
}

export interface TamanhoEscolhido {
  tamanhoFonte: number;
  alturaLinha: number;
  /** Linhas que cabem numa página nesse tamanho. */
  linhasPorPagina: number;
  paginas: number;
}

export const PISO_FONTE_PDF = 7;

/**
 * Maior tamanho de fonte, do teto ao piso em passos de 0,5 pt, em que todas as linhas cabem na altura
 * disponível. No piso e ainda sem caber, as linhas passam para uma 2ª página (e a seguinte, se preciso).
 * Cálculo puro de diagramação: não decide nada sobre os dados.
 */
export function escolherTamanho({
  linhas,
  alturaDisponivel,
  teto,
  piso = PISO_FONTE_PDF,
  passo = 0.5,
}: EntradaAjuste): TamanhoEscolhido {
  const alturaDa = (fonte: number) => fonte * ALTURA_LINHA_POR_FONTE;
  for (let fonte = teto; fonte >= piso; fonte -= passo) {
    if (linhas * alturaDa(fonte) <= alturaDisponivel) {
      return { tamanhoFonte: fonte, alturaLinha: alturaDa(fonte), linhasPorPagina: Math.max(linhas, 1), paginas: 1 };
    }
  }
  const alturaLinha = alturaDa(piso);
  const linhasPorPagina = Math.max(1, Math.floor(alturaDisponivel / alturaLinha));
  return { tamanhoFonte: piso, alturaLinha, linhasPorPagina, paginas: Math.ceil(linhas / linhasPorPagina) };
}
