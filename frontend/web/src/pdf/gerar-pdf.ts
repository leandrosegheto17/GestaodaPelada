import type { ProjecaoPdf } from '@pelada/contrato';
import type { jsPDF } from 'jspdf';
import { alturaDoCabecalho } from './cabecalho';
import { escolherTamanho } from './ajuste-fonte';
import { desenharFolha, MARGEM_PT } from './desenhar-folha';
import { precarregarFontes, registrarFontes, type LerFonte } from './fontes-pdf';
import { alturaDaLegenda, desenharLegenda, linhasDaLegenda } from './legenda';
import { alturaDoRodape, desenharRodape, MARGEM_INFERIOR_PT } from './rodape';
import { medirTabela } from './tabela';
import { tokensPdf, type TokensPdf } from './tokens-pdf';

export interface ResumoDoPdf {
  paginas: number;
  tamanhoFonte: number;
}

/**
 * Desenha o PDF no documento: escolhe o maior tamanho de fonte (de 8,5 a 7 pt) em que as linhas cabem em
 * uma página; no piso e ainda sem caber, continua em outra página. Legenda e rodapé fecham a última página
 * (o rodapé aparece em todas). Só o que veio na projeção é desenhado.
 */
export function montarDocumento(doc: jsPDF, projecao: ProjecaoPdf, tokens: TokensPdf = tokensPdf()): ResumoDoPdf {
  const larguraUtil = doc.internal.pageSize.getWidth() - MARGEM_PT * 2;
  const alturaPagina = doc.internal.pageSize.getHeight();
  const area = { x: MARGEM_PT, y: MARGEM_PT, largura: larguraUtil };
  const legenda = linhasDaLegenda(doc, tokens, larguraUtil, projecao.semPartidasNoMes);

  const fixa =
    MARGEM_PT +
    alturaDoCabecalho(tokens) +
    medirTabela(area, projecao.colunas.length, tokens).alturaCabecalho +
    alturaDaLegenda(tokens, legenda.length) +
    alturaDoRodape(tokens) +
    MARGEM_INFERIOR_PT;
  const tamanho = escolherTamanho({
    linhas: projecao.linhas.length,
    alturaDisponivel: alturaPagina - fixa,
    teto: tokens.fonte.texto,
  });

  const paginas: ProjecaoPdf['linhas'][] = [];
  for (let i = 0; i < Math.max(projecao.linhas.length, 1); i += tamanho.linhasPorPagina) {
    paginas.push(projecao.linhas.slice(i, i + tamanho.linhasPorPagina));
  }
  paginas.forEach((linhas, indice) => {
    if (indice > 0) doc.addPage();
    const { fimDaTabela } = desenharFolha(
      doc,
      { ...projecao, linhas },
      { tamanhoFonte: tamanho.tamanhoFonte, alturaLinha: tamanho.alturaLinha },
      tokens,
    );
    if (indice === paginas.length - 1) desenharLegenda(doc, tokens, area, fimDaTabela, projecao.semPartidasNoMes);
    desenharRodape(doc, tokens, area, projecao.urlPublica);
  });
  return { paginas: paginas.length, tamanhoFonte: tamanho.tamanhoFonte };
}

/**
 * Gera o PDF do ranking no navegador (A4 retrato). O jsPDF entra por import dinâmico: fica fora do pacote
 * inicial e só é baixado quando alguém exporta.
 */
export async function gerarPdf(projecao: ProjecaoPdf, opcoes: { lerFonte?: LerFonte } = {}): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  await registrarFontes(doc, opcoes.lerFonte);
  montarDocumento(doc, projecao);
  return doc.output('blob');
}

/** Traz o jsPDF e as fontes para a memória, em segundo plano, antes do toque em "Exportar PDF". */
export async function precarregarPdf(opcoes: { lerFonte?: LerFonte } = {}): Promise<void> {
  await Promise.all([import('jspdf'), precarregarFontes(opcoes.lerFonte)]);
}
