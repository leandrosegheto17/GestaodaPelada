export { desenharCabecalho, FRASE_MES_VAZIO, type AreaPdf } from './cabecalho';
export {
  ALTURA_LINHA_POR_FONTE,
  desenharFolha,
  MARGEM_PT,
  type OpcoesFolha,
  type ResultadoFolha,
} from './desenhar-folha';
export { FONTES_PDF, lerFontePorRede, registrarFontes, usarFonte, type FontePdf, type LerFonte } from './fontes-pdf';
export { desenharIconeTempo } from './icones-tempo';
export { desenharMarca, medidasDaMarca, sufixoDaSituacao } from './marca';
export { desenharTabela, medirTabela, type OpcoesTabela } from './tabela';
export { hexParaRgb, lerVariaveis, tokensPdf, type CoresSituacao, type Rgb, type TokensPdf } from './tokens-pdf';
