import { describe, expect, it } from 'vitest';
import { previaDoInicio } from '../../src/index.js';
import { CONFIGS, jogador, partida, presenca } from '../apoio/historico.js';

const HOJE = '2026-10-20';
const partidas = ['2026-09-13', '2026-09-20', '2026-09-27', '2026-10-11'].map((d) => partida(d));
const base = { hoje: HOJE, partidas, configsPesos: CONFIGS };

// Vandré: período e S em 20/09, presenças de 20/09, 27/09 e 11/10, inicial 30. Rivais empatam o resto.
const vandre = {
  ...jogador('v', 'Vandre', 1990, [{ inicio: '2026-09-20', fim: null }], 30),
  inicioPontuacao: '2026-09-20',
};
const rival = (id: string, inicial: number) => jogador(id, id, 1991, [{ inicio: '2026-01-01', fim: null }], inicial);
const presencasVandre = ['2026-09-20', '2026-09-27', '2026-10-11'].map((d) => presenca('v', d));
const previa = (
  novoInicio: string,
  jogadores = [vandre, rival('r1', 40), rival('r2', 20)],
  presencas = presencasVandre,
) => previaDoInicio({ ...base, jogadores, presencas, jogadorId: 'v', novoInicio });

describe('previaDoInicio', () => {
  it('avançar: o acumulado e a posição caem, nada novo passa a constar', () => {
    const r = previa('2026-10-11');
    expect(r).toEqual({
      acumuladoAntes: 33,
      acumuladoDepois: 1,
      posicaoAntes: 2,
      posicaoDepois: 3,
      rodadasQuePassamAConstar: 0,
    });
  });

  it('recuar sem lançamento no intervalo não muda o acumulado; as rodadas anteriores passam a constar', () => {
    const r = previa('2026-09-13');
    expect(r.acumuladoAntes).toBe(r.acumuladoDepois);
    expect(r.posicaoAntes).toBe(r.posicaoDepois);
    expect(r.rodadasQuePassamAConstar).toBe(1);
  });

  it('recuar com lançamento no intervalo soma as presenças que voltam', () => {
    const v = {
      ...vandre,
      periodos: [{ inicio: '2026-01-01', fim: null }],
      pontuacaoInicial: 0,
      inicioPontuacao: '2026-09-27',
    };
    const r = previa('2026-09-20', [v, rival('r1', 40)]);
    expect(r.acumuladoDepois - r.acumuladoAntes).toBe(1);
    expect(r.rodadasQuePassamAConstar).toBe(1);
  });

  it('recuar antes do início do primeiro período alinha o período e conta as partidas desde a nova data', () => {
    const r = previa('2026-09-13');
    expect(r.rodadasQuePassamAConstar).toBe(1);
  });

  it('S depois da primeira presença deixa a pontuação inicial de fora; voltar devolve', () => {
    const avancado = previa('2026-09-27').acumuladoDepois;
    expect(avancado).toBe(2);
    const v2 = { ...vandre, inicioPontuacao: '2026-09-27' };
    expect(previa('2026-09-20', [v2, rival('r1', 40)]).acumuladoDepois).toBe(33);
  });

  it('jogador inativo hoje: acumulado calculado, posição nula', () => {
    const inativo = { ...vandre, periodos: [{ inicio: '2026-09-20', fim: '2026-10-15' }] };
    const r = previa('2026-10-11', [inativo, rival('r1', 40)]);
    expect(r.posicaoAntes).toBeNull();
    expect(r.posicaoDepois).toBeNull();
    expect(r.acumuladoAntes).toBe(33);
  });

  it('data igual à atual: nada muda', () => {
    expect(previa('2026-09-20')).toMatchObject({ rodadasQuePassamAConstar: 0 });
    expect(previa('2026-09-20').acumuladoAntes).toBe(previa('2026-09-20').acumuladoDepois);
  });

  it('só o jogador editado muda de acumulado (RN-28)', () => {
    const outros = [rival('r1', 40), rival('r2', 20)];
    const r = previa('2026-10-11', [vandre, ...outros]);
    expect(r.acumuladoAntes).not.toBe(r.acumuladoDepois);
    expect(r.posicaoAntes).toBe(2);
  });
});
