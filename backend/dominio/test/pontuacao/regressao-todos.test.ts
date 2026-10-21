import { describe, expect, it } from 'vitest';
import { calcularPdf, calcularRanking, ordenarPrioridade, type JogadorDoRanking } from '../../src/index.js';
import { historicoGrande } from '../apoio/historico-grande.js';

const HOJE = '2027-01-10';
const MESES = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
const base = historicoGrande();

const resumo = (l: { jogadorId: string; posicao: number; ptsInicial: number; ptsFinal: number }) =>
  `${l.jogadorId}:${l.posicao}:${l.ptsInicial}:${l.ptsFinal}`;

function resultados(jogadores: readonly JogadorDoRanking[], pontosFora = '-') {
  const historico = { ...base, jogadores };
  const aptos = jogadores.map((j) => j.id);
  return {
    meses: MESES.map((mes) => {
      const entrada = { ...historico, hoje: HOJE, mes };
      return {
        mes,
        ranking: calcularRanking(entrada).linhas.map(resumo),
        pdf: calcularPdf(entrada).linhas.map(
          (l) => `${resumo(l)}:${l.rodadas.map((r) => r.pontos ?? pontosFora).join(',')}`,
        ),
      };
    }),
    prioridade: base.partidas.map((p) => ordenarPrioridade({ ...historico, dataPartida: p.data, aptos }).join(',')),
  };
}

const primeiraPresenca = (jogadorId: string) =>
  base.presencas
    .filter((pr) => pr.jogadorId === jogadorId)
    .map((pr) => base.partidas.find((p) => p.id === pr.partidaId)!.data)
    .sort()[0];

describe('resultado de todos os jogadores com o histórico grande', () => {
  it('ranking e PDF de cada mês', () => {
    expect(resultados(base.jogadores).meses).toMatchSnapshot();
  });

  it('prioridade na véspera de cada partida', () => {
    expect(resultados(base.jogadores).prioridade).toMatchSnapshot();
  });

  it('data de início igual ao início do primeiro período não muda nada', () => {
    const comInicio = base.jogadores.map((j) => ({ ...j, inicioPontuacao: j.periodos[0]!.inicio }));
    expect(resultados(comInicio)).toEqual(resultados(base.jogadores));
  });

  it('data de início igual à primeira presença não muda nada', () => {
    const comInicio = base.jogadores.map((j) => ({
      ...j,
      inicioPontuacao: primeiraPresenca(j.id) ?? j.periodos[0]!.inicio,
    }));
    // Antes da primeira presença a rodada passa de falta (0) para "–"; os totais são os mesmos.
    expect(resultados(comInicio, '0')).toEqual(resultados(base.jogadores, '0'));
  });
});
