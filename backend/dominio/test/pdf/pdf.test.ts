import { describe, expect, it } from 'vitest';
import { calcularPdf, calcularRanking, escolherColunasPdf, MAX_COLUNAS_PDF, somarDias } from '../../src/index.js';
import { historicoDeTresMeses, partida } from '../apoio/historico.js';

const datas = (inicio: string, quantas: number, passo = 7) =>
  Array.from({ length: quantas }, (_, i) => somarDias(inicio, i * passo));
const partidasEm = (lista: string[]) => lista.map((d) => partida(d));

describe('escolherColunasPdf', () => {
  it('mês com 4 partidas e 20 anteriores: 12 colunas, 4 do mês, em ordem cronológica', () => {
    const anteriores = datas('2026-04-02', 20);
    const doMes = ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'];
    const r = escolherColunasPdf(partidasEm([...doMes, ...anteriores]), '2026-10');
    expect(r.colunas).toHaveLength(MAX_COLUNAS_PDF);
    expect(r.colunas.filter((c) => c.doMesExibido).map((c) => c.data)).toEqual(doMes);
    const ordem = r.colunas.map((c) => c.data);
    expect([...ordem].sort()).toEqual(ordem);
    expect(r.semPartidasNoMes).toBe(false);
  });

  it('poucas anteriores: entram todas', () => {
    const r = escolherColunasPdf(
      partidasEm(['2026-09-03', '2026-09-10', '2026-09-24', '2026-10-01', '2026-10-08']),
      '2026-10',
    );
    expect(r.colunas).toHaveLength(5);
    expect(r.colunas.map((c) => c.doMesExibido)).toEqual([false, false, false, true, true]);
  });

  it('mês sem partidas: as 12 anteriores, todas fora do mês', () => {
    const r = escolherColunasPdf(partidasEm(datas('2026-01-01', 20)), '2026-07');
    expect(r.semPartidasNoMes).toBe(true);
    expect(r.colunas).toHaveLength(12);
    expect(r.colunas.every((c) => !c.doMesExibido)).toBe(true);
    expect(r.colunas.every((c) => c.data <= '2026-07-31')).toBe(true);
  });

  it('sem nenhuma partida: sem colunas', () => {
    expect(escolherColunasPdf([], '2026-10')).toEqual({ colunas: [], semPartidasNoMes: true });
  });

  it('virada de ano: janeiro completa com dezembro; partida depois do mês não entra', () => {
    const r = escolherColunasPdf(partidasEm(['2025-12-11', '2025-12-18', '2026-01-08', '2026-02-05']), '2026-01');
    expect(r.colunas.map((c) => c.data)).toEqual(['2025-12-11', '2025-12-18', '2026-01-08']);
  });

  it('mês com mais partidas que o limite: ficam as mais recentes', () => {
    const r = escolherColunasPdf(partidasEm(datas('2026-10-01', 14, 2).filter((d) => d <= '2026-10-31')), '2026-10');
    expect(r.colunas).toHaveLength(12);
    expect(r.colunas.at(-1)?.data).toBe('2026-10-27');
  });
});

describe('calcularPdf', () => {
  const base = historicoDeTresMeses();
  const entrada = (mes: string, hoje = '2026-10-10') => ({ ...base, hoje, mes });

  it.each(['2026-08', '2026-09', '2026-10'])('%s: linhas e pontos finais iguais aos do ranking', (mes) => {
    const pdf = calcularPdf(entrada(mes));
    const ranking = calcularRanking(entrada(mes));
    expect(pdf.linhas.map((l) => [l.jogadorId, l.posicao, l.apelido, l.ptsFinal])).toEqual(
      ranking.linhas.map((l) => [l.jogadorId, l.posicao, l.apelido, l.ptsFinal]),
    );
  });

  it.each(['2026-08', '2026-09', '2026-10'])('%s: ptsInicial + pontos das colunas = ptsFinal em toda linha', (mes) => {
    for (const linha of calcularPdf(entrada(mes)).linhas) {
      const soma = linha.rodadas.reduce((s, r) => s + (r.pontos ?? 0), linha.ptsInicial);
      expect(soma).toBe(linha.ptsFinal);
    }
  });

  it('outubro: colunas de agosto a outubro e jogador que entra depois aparece como "fora" antes', () => {
    const pdf = calcularPdf(entrada('2026-10'));
    expect(pdf.colunas.map((c) => c.data)).toEqual([
      '2026-08-06',
      '2026-08-13',
      '2026-09-03',
      '2026-09-10',
      '2026-10-01',
      '2026-10-08',
    ]);
    const duda = pdf.linhas.find((l) => l.jogadorId === 'd')!;
    expect(duda.rodadas.slice(0, 5).every((r) => r.situacao === 'fora' && r.pontos === null)).toBe(true);
    expect(duda.ptsInicial).toBe(0);
  });

  it('as 12 colunas cortam o começo: ptsInicial passa a ser o acumulado antes da primeira coluna', () => {
    const extra = datas('2026-07-02', 8).map((d) => partida(d));
    const pdf = calcularPdf({ ...entrada('2026-10'), partidas: [...base.partidas, ...extra] });
    expect(pdf.colunas).toHaveLength(12);
    for (const linha of pdf.linhas) {
      const soma = linha.rodadas.reduce((s, r) => s + (r.pontos ?? 0), linha.ptsInicial);
      expect(soma).toBe(linha.ptsFinal);
    }
  });

  it('sem partidas no histórico: sem colunas e ptsInicial = ptsFinal', () => {
    const pdf = calcularPdf({ ...entrada('2026-10'), partidas: [], presencas: [] });
    expect(pdf.colunas).toEqual([]);
    expect(pdf.linhas.every((l) => l.ptsInicial === l.ptsFinal && l.rodadas.length === 0)).toBe(true);
  });

  it('só os ativos hoje aparecem (inativado some)', () => {
    expect(calcularPdf(entrada('2026-10')).linhas.some((l) => l.jogadorId === 'f')).toBe(false);
  });
});
