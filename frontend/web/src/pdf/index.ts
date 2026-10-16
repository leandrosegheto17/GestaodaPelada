export { escolherTamanho, PISO_FONTE_PDF, type TamanhoEscolhido } from './ajuste-fonte';
export { alturaDoCabecalho, desenharCabecalho, FRASE_MES_VAZIO, type AreaPdf } from './cabecalho';
export { gerarPdf, montarDocumento, type ResumoDoPdf } from './gerar-pdf';
export { desenharLegenda, textoLegenda } from './legenda';
export { desenharRodape, enderecoParaLer, NOME_DO_APP } from './rodape';
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
