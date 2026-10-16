import type { ProjecaoPdf } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import { lerFonteDoDisco, novoDocumento, projecaoDoMockup } from './apoio-teste';
import { FRASE_MES_VAZIO } from './cabecalho';
import { gerarPdf, montarDocumento } from './gerar-pdf';
import { textoLegenda } from './legenda';
import { enderecoParaLer, NOME_DO_APP } from './rodape';

function textosDesenhados(doc: Awaited<ReturnType<typeof novoDocumento>>) {
  const textos: string[] = [];
  const texto = doc.text.bind(doc) as (...a: unknown[]) => unknown;
  vi.spyOn(doc, 'text').mockImplementation(((...a: unknown[]) => {
    textos.push(Array.isArray(a[0]) ? (a[0] as string[]).join(' ') : String(a[0]));
    return texto(...a);
  }) as never);
  return textos;
}

function sintetica(jogadores: number, colunas: number): ProjecaoPdf {
  const datas = Array.from({ length: colunas }, (_, i) => {
    const mes = 1 + Math.floor(i / 4);
    return `2026-${String(mes).padStart(2, '0')}-${String(1 + (i % 4) * 7).padStart(2, '0')}`;
  });
  return {
    grupo: { nome: 'Grupo de teste', slug: 'grupo-de-teste' },
    mes: '2026-03',
    geradoEm: '2026-10-22T21:40:00Z',
    urlPublica: 'https://exemplo.invalid/g/grupo-de-teste',
    semPartidasNoMes: false,
    colunas: datas.map((data) => ({ data, choveu: false, doMesExibido: data.startsWith('2026-03') })),
    linhas: Array.from({ length: jogadores }, (_, i) => ({
      posicao: i + 1,
      apelido: `Jogador com apelido bem comprido ${i + 1}`.slice(0, 30),
      ptsInicial: 3,
      rodadas: datas.map(() => ({ situacao: 'presente' as const, pontos: 1 })),
      ptsFinal: 3 + colunas,
    })),
  };
}

describe('montarDocumento', () => {
  it.each(['publico-pdf-2026-10.json', 'publico-pdf-2026-07.json'] as const)('%s gera uma página só', async (nome) => {
    const doc = await novoDocumento();
    const resumo = montarDocumento(doc, projecaoDoMockup(nome));
    expect(resumo.paginas).toBe(1);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(resumo.tamanhoFonte).toBe(8.5);
  });

  it('traz a legenda completa, o nome do app e o endereço público', async () => {
    const projecao = projecaoDoMockup('publico-pdf-2026-10.json');
    const doc = await novoDocumento();
    const textos = textosDesenhados(doc);
    montarDocumento(doc, projecao);
    expect(textos).toContain(NOME_DO_APP);
    expect(textos).toContain(enderecoParaLer(projecao.urlPublica));
    expect(textos.join(' ').replace(/\s+/g, ' ')).toContain(textoLegenda(false).slice(0, 60));
    expect(textos.join(' ')).toContain('Pts inicial + rodadas = Pts final');
  });

  it('mês sem partidas: a frase vai ao cabeçalho e a legenda é a curta', async () => {
    const doc = await novoDocumento();
    const textos = textosDesenhados(doc);
    montarDocumento(doc, projecaoDoMockup('publico-pdf-2026-07.json'));
    expect(textos).toContain(FRASE_MES_VAZIO);
    expect(textoLegenda(true)).not.toContain('pontos antes da 1ª coluna');
  });

  it('40 jogadores × 12 colunas cabem numa página com fonte de pelo menos 7 pt', async () => {
    const doc = await novoDocumento();
    const resumo = montarDocumento(doc, sintetica(40, 12));
    expect(resumo.paginas).toBe(1);
    expect(resumo.tamanhoFonte).toBeGreaterThanOrEqual(7);
  });

  it('muito além de 40 jogadores continua em outra página', async () => {
    const doc = await novoDocumento();
    const resumo = montarDocumento(doc, sintetica(90, 12));
    expect(resumo.paginas).toBeGreaterThan(1);
    expect(doc.getNumberOfPages()).toBe(resumo.paginas);
  });
});

describe('gerarPdf', () => {
  it('devolve um PDF (Blob) pelo import dinâmico do jsPDF', async () => {
    const blob = await gerarPdf(projecaoDoMockup('publico-pdf-2026-10.json'), { lerFonte: lerFonteDoDisco });
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(5_000);
    const inicio = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 5).arrayBuffer()));
    expect(inicio).toBe('%PDF-');
  });
});
