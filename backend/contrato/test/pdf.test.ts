import { describe, expect, it } from 'vitest';
import { MAX_COLUNAS_PDF, pdfConsulta, projecaoPdf } from '../src/index.js';
import { respostas } from './apoio/respostas.js';

describe('respostas do mockup', () => {
  it.each(respostas(/^publico-pdf-.*\.json$/))('$nome passa em projecaoPdf', ({ json }) => {
    expect(projecaoPdf.safeParse(json).success).toBe(true);
  });
});

type Pdf = {
  grupo: Record<string, unknown>;
  colunas: Record<string, unknown>[];
  linhas: { rodadas: unknown[] }[] & Record<string, unknown>[];
} & Record<string, unknown>;

const base = respostas(/^publico-pdf-2026-10\.json$/)[0]?.json as Pdf;
const copia = (): Pdf => structuredClone(base);

describe('campos proibidos (G-10)', () => {
  const proibidos = {
    telefone: '(11) 91234-5678',
    anoNascimento: 1990,
    idade: 36,
    posicao: 'atacante',
    notas: [8],
    nivel: 6.8,
    saldoCentavos: 100,
    valorCentavos: 100,
    financeiro: {},
    jogadorId: 'j-1',
    email: 'a@b.com',
  };
  it.each(Object.entries(proibidos))('%s é recusado na raiz, no grupo, na coluna e na linha', (campo, valor) => {
    const raiz = { ...copia(), [campo]: valor };
    const grupo = { ...copia(), grupo: { ...base.grupo, [campo]: valor } };
    const coluna = copia();
    coluna.colunas[0] = { ...coluna.colunas[0], [campo]: valor };
    const linha = copia();
    linha.linhas[0] = { ...linha.linhas[0]!, [campo]: valor };
    for (const alvo of [raiz, grupo, coluna, linha]) expect(projecaoPdf.safeParse(alvo).success).toBe(false);
  });

  it.each(['id', 'diaSemana', 'frequencia', 'horario'])('grupo só tem nome e slug: %s é recusado', (campo) => {
    const pdf = { ...copia(), grupo: { ...base.grupo, [campo]: 'x' } };
    expect(projecaoPdf.safeParse(pdf).success).toBe(false);
  });
});

describe('bordas', () => {
  it(`mais de ${MAX_COLUNAS_PDF} colunas é recusado`, () => {
    const pdf = copia();
    pdf.colunas = [...pdf.colunas, { ...pdf.colunas[0] }];
    pdf.linhas = pdf.linhas.map((l) => ({ ...l, rodadas: [...l.rodadas, l.rodadas[0]] }));
    expect(pdf.colunas).toHaveLength(MAX_COLUNAS_PDF + 1);
    expect(projecaoPdf.safeParse(pdf).success).toBe(false);
  });

  it('rodadas com tamanho diferente das colunas é recusado', () => {
    const pdf = copia();
    pdf.linhas[0] = { ...pdf.linhas[0]!, rodadas: pdf.linhas[0]!.rodadas.slice(1) };
    expect(projecaoPdf.safeParse(pdf).success).toBe(false);
  });

  it.each([
    ['urlPublica', 'não é url'],
    ['mes', '2026-13'],
    ['geradoEm', '2026-10-22'],
  ])('%s inválido é recusado', (campo, valor) => {
    expect(projecaoPdf.safeParse({ ...copia(), [campo]: valor }).success).toBe(false);
  });

  it('mês sem partidas não pode ter coluna do mês', () => {
    expect(projecaoPdf.safeParse({ ...copia(), semPartidasNoMes: true }).success).toBe(false);
  });

  it('sem colunas e com linhas de rodadas vazias é aceito', () => {
    const pdf = { ...copia(), colunas: [], semPartidasNoMes: true };
    pdf.linhas = pdf.linhas.map((l) => ({ ...l, rodadas: [] }));
    expect(projecaoPdf.safeParse(pdf).success).toBe(true);
  });
});

describe('consulta', () => {
  it('usa o ?mes= do ranking público', () => {
    expect(pdfConsulta.safeParse({ mes: '2026-10' }).success).toBe(true);
    expect(pdfConsulta.safeParse({ mes: '2026-13' }).success).toBe(false);
    expect(pdfConsulta.safeParse({ outro: 1 }).success).toBe(false);
  });
});
