import { describe, expect, it } from 'vitest';
import {
  agregar,
  calcularNivel,
  dividirMeioParaCima,
  indicadoresDois,
  indicadoresVarios,
  somaNivel2oTempo,
  trocarNoAgregado,
  type JogadorSim,
} from '../../src/index.js';

const sim = (id: string, nivel: number, idade = 40, so1oTempo = false): JogadorSim => ({
  id,
  nivel,
  idade,
  so1oTempo,
  semNota: false,
});
const mapa = (js: JogadorSim[]) => new Map(js.map((j) => [j.id, j]));
const rankDe = (ids: string[]) => new Map(ids.map((id, i) => [id, i]));

describe('dividirMeioParaCima', () => {
  it.each([
    [5, 2, 3],
    [4, 2, 2],
    [10, 3, 3],
    [11, 3, 4],
    [0, 5, 0],
  ])('%i ÷ %i = %i', (num, den, esperado) => {
    expect(dividirMeioParaCima(num, den)).toBe(esperado);
  });

  it('calcularNivel segue igual após a extração', () => {
    expect(calcularNivel([8, 7, 6, 7, 8, 5]).nivel).toBe(683);
    expect(calcularNivel([]).nivel).toBe(550);
  });
});

describe('indicadoresDois', () => {
  const todos = [
    sim('a', 700),
    sim('b', 600),
    sim('c', 500, 30, true),
    sim('d', 400),
    sim('r1', 650),
    sim('r2', 550),
    sim('r3', 450),
  ];
  const jogadores = mapa(todos);
  const rank = rankDe(['a', 'b', 'c', 'd', 'r1', 'r2', 'r3']);

  it('sai o "só 1º tempo" e depois o pior; pares na ordem de saída com os reservas do melhor ao pior', () => {
    const r = indicadoresDois({ titulares: ['d', 'b', 'a', 'c'], entram: ['r2', 'r1'] }, jogadores, rank);
    expect(r.saem).toEqual(['c', 'd']);
    expect(r.pares).toEqual([
      { sai: 'c', entra: 'r1' },
      { sai: 'd', entra: 'r2' },
    ]);
    expect(r.substituicoes).toBe(2);
    expect(r.nivelSoma1oTempo).toBe(2200);
    expect(r.nivelMedio1oTempo).toBe(550);
    expect(r.nivelSoma2oTempo).toBe(700 + 600 + 650 + 550);
    expect(r.jogadores1oTempo).toBe(4);
    expect(r.jogadores2oTempo).toBe(4);
  });

  it('só 1º tempo sem reserva: o 2º tempo tem menos gente e a média usa o número real', () => {
    const r = indicadoresDois({ titulares: ['a', 'b', 'c'], entram: [] }, jogadores, rank);
    expect(r.saem).toEqual(['c']);
    expect(r.pares).toEqual([]);
    expect(r.saiSemPar).toEqual(['c']);
    expect(r.jogadores2oTempo).toBe(2);
    expect(r.nivelMedio2oTempo).toBe(650);
  });

  it('reserva a mais que os titulares fica sem par; ninguém no 2º tempo dá média nula', () => {
    const r = indicadoresDois({ titulares: ['c'], entram: [] }, jogadores, rank);
    expect(r.nivelMedio2oTempo).toBeNull();
    const extra = indicadoresDois({ titulares: ['a'], entram: ['r1', 'r2'] }, jogadores, rank);
    expect(extra.entraSemPar).toEqual(['r2']);
  });

  it('média com meio exato sobe', () => {
    const j = mapa([sim('x', 500), sim('y', 501)]);
    const r = indicadoresDois({ titulares: ['x', 'y'], entram: [] }, j, rankDe(['x', 'y']));
    expect(r.nivelMedio1oTempo).toBe(501);
  });

  it('jogador desconhecido é erro de programação', () => {
    expect(() => indicadoresDois({ titulares: ['zz'], entram: [] }, jogadores, rank)).toThrow();
  });
});

describe('indicadoresVarios', () => {
  it('quatro times de 4 e um de 2, com médias por time', () => {
    const js = Array.from({ length: 18 }, (_, i) => sim(`j${i}`, 500 + i, 30 + i));
    const ids = js.map((j) => j.id);
    const times = [0, 4, 8, 12, 16].map((i) => ({ jogadores: ids.slice(i, i + 4) }));
    const r = indicadoresVarios({ times }, mapa(js));
    expect(r.map((t) => t.jogadores)).toEqual([4, 4, 4, 4, 2]);
    expect(r[4]).toEqual({ jogadores: 2, nivelSoma: 1033, nivelMedio: 517, idadeMedia: 4650 });
  });
});

describe('avaliação incremental', () => {
  it('200 trocas determinísticas dão o mesmo que agregar do zero', () => {
    const js = Array.from({ length: 10 }, (_, i) => sim(`j${i}`, 300 + 37 * i, 20 + i));
    const jogadores = mapa(js);
    let idsA = js.slice(0, 5).map((j) => j.id);
    let idsB = js.slice(5).map((j) => j.id);
    let a = agregar(idsA, jogadores);
    let b = agregar(idsB, jogadores);
    for (let passo = 0; passo < 200; passo += 1) {
      const ia = (passo * 7) % idsA.length;
      const ib = (passo * 3) % idsB.length;
      const deA = jogadores.get(idsA[ia]!)!;
      const deB = jogadores.get(idsB[ib]!)!;
      [a, b] = trocarNoAgregado(a, b, deA, deB);
      idsA = idsA.map((id, i) => (i === ia ? deB.id : id));
      idsB = idsB.map((id, i) => (i === ib ? deA.id : id));
      expect(a).toEqual(agregar(idsA, jogadores));
      expect(b).toEqual(agregar(idsB, jogadores));
    }
  });

  it('somaNivel2oTempo bate com indicadoresDois', () => {
    const titulares = [sim('a', 700), sim('b', 600), sim('c', 500)];
    const entram = [sim('r', 650)];
    const j = mapa([...titulares, ...entram]);
    const r = indicadoresDois({ titulares: ['a', 'b', 'c'], entram: ['r'] }, j, rankDe(['a', 'b', 'c', 'r']));
    expect(somaNivel2oTempo(titulares, entram)).toBe(r.nivelSoma2oTempo);
  });
});
