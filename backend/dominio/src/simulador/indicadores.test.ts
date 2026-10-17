import { describe, expect, it } from 'vitest';
import { dividirMeioParaCima } from '../elenco/nivel.js';
import { agregar, indicadoresDois, indicadoresVarios, somaNivel2oTempo, trocarNoAgregado } from './indicadores.js';
import type { JogadorSim } from './tipos.js';

function criar(lista: Array<[string, number, number, boolean?]>) {
  const jogadores = new Map<string, JogadorSim>();
  const rank = new Map<string, number>();
  lista.forEach(([id, nivel, idade, so1o], i) => {
    jogadores.set(id, { id, nivel, idade, semNota: nivel === 550, so1oTempo: so1o ?? false });
    rank.set(id, i);
  });
  return { jogadores, rank };
}

describe('dividirMeioParaCima', () => {
  it.each([
    [5, 2, 3],
    [4, 2, 2],
    [10, 3, 3],
    [11, 3, 4],
  ])('%i / %i = %i', (a, b, esperado) => {
    expect(dividirMeioParaCima(a, b)).toBe(esperado);
  });
});

describe('indicadoresDois', () => {
  const { jogadores, rank } = criar([
    ['a', 800, 30],
    ['b', 700, 20],
    ['pedrao', 600, 40],
    ['juninho', 550, 25, true],
    ['cabeca', 683, 22],
    ['japa', 500, 28],
  ]);

  it('pares sai -> entra, substituições e médias', () => {
    const r = indicadoresDois(
      { titulares: ['a', 'b', 'pedrao', 'juninho'], entram: ['cabeca', 'japa'] },
      jogadores,
      rank,
    );
    expect(r.saem).toEqual(['juninho', 'pedrao']);
    expect(r.pares).toEqual([
      { sai: 'juninho', entra: 'cabeca' },
      { sai: 'pedrao', entra: 'japa' },
    ]);
    expect(r.substituicoes).toBe(2);
    expect(r.nivelSoma1oTempo).toBe(2650);
    expect(r.nivelMedio1oTempo).toBe(dividirMeioParaCima(2650, 4));
    expect(r.nivelSoma2oTempo).toBe(800 + 700 + 683 + 500);
    expect(r.jogadores2oTempo).toBe(4);
    expect(r.idadeMedia).toBe(dividirMeioParaCima(100 * (30 + 20 + 40 + 25 + 22 + 28), 6));
    expect(r.saiSemPar).toEqual([]);
    expect(r.entraSemPar).toEqual([]);
  });

  it('só 1º tempo sem reserva: 2º tempo divide pelo número real', () => {
    const r = indicadoresDois({ titulares: ['a', 'juninho'], entram: [] }, jogadores, rank);
    expect(r.saem).toEqual(['juninho']);
    expect(r.pares).toEqual([]);
    expect(r.saiSemPar).toEqual(['juninho']);
    expect(r.jogadores2oTempo).toBe(1);
    expect(r.nivelMedio2oTempo).toBe(800);
  });

  it('ninguém no 2º tempo: média null', () => {
    const r = indicadoresDois({ titulares: ['juninho'], entram: [] }, jogadores, rank);
    expect(r.jogadores2oTempo).toBe(0);
    expect(r.nivelMedio2oTempo).toBeNull();
  });

  it('time vazio: médias null', () => {
    const r = indicadoresDois({ titulares: [], entram: [] }, jogadores, rank);
    expect(r.nivelMedio1oTempo).toBeNull();
    expect(r.idadeMedia).toBeNull();
  });

  it('reserva a mais que quem sai: entraSemPar', () => {
    const r = indicadoresDois({ titulares: ['a', 'b'], entram: ['cabeca'] }, jogadores, rank);
    expect(r.saem).toEqual(['b']);
    expect(r.pares).toEqual([{ sai: 'b', entra: 'cabeca' }]);
  });

  it('jogador desconhecido lança erro', () => {
    expect(() => indicadoresDois({ titulares: ['x'], entram: [] }, jogadores, rank)).toThrow();
  });
});

describe('indicadoresVarios', () => {
  it('22 jogadores em 4,4,4,4,4,2', () => {
    const lista: Array<[string, number, number]> = Array.from({ length: 22 }, (_, i) => [
      `j${i}`,
      500 + i * 10,
      20 + i,
    ]);
    const { jogadores } = criar(lista);
    const ids = lista.map((l) => l[0]);
    const tamanhos = [4, 4, 4, 4, 4, 2];
    let ini = 0;
    const times = tamanhos.map((t) => {
      const jogadoresDoTime = ids.slice(ini, ini + t);
      ini += t;
      return { jogadores: jogadoresDoTime };
    });
    const r = indicadoresVarios({ times }, jogadores);
    expect(r.map((x) => x.jogadores)).toEqual(tamanhos);
    expect(r[5]!.nivelSoma).toBe(500 + 22 * 0 + 20 * 10 + 500 + 21 * 10);
    expect(r[5]!.nivelMedio).toBe(dividirMeioParaCima(r[5]!.nivelSoma, 2));
    expect(r[0]!.idadeMedia).toBe(dividirMeioParaCima(100 * (20 + 21 + 22 + 23), 4));
  });
});

describe('incremental', () => {
  it('200 trocas determinísticas batem com agregar do zero', () => {
    const lista: Array<[string, number, number]> = Array.from({ length: 20 }, (_, i) => [
      `j${i}`,
      300 + ((i * 37) % 600),
      18 + ((i * 7) % 25),
    ]);
    const { jogadores } = criar(lista);
    let a = lista.slice(0, 10).map((l) => l[0]);
    let b = lista.slice(10).map((l) => l[0]);
    let agA = agregar(a, jogadores);
    let agB = agregar(b, jogadores);
    for (let k = 0; k < 200; k += 1) {
      const i = (k * 3) % a.length;
      const j = (k * 7 + 1) % b.length;
      const deA = jogadores.get(a[i]!)!;
      const deB = jogadores.get(b[j]!)!;
      [agA, agB] = trocarNoAgregado(agA, agB, deA, deB);
      [a[i], b[j]] = [b[j]!, a[i]!];
      a = [...a];
      b = [...b];
      expect(agA).toEqual(agregar(a, jogadores));
      expect(agB).toEqual(agregar(b, jogadores));
    }
  });

  it('somaNivel2oTempo bate com indicadoresDois', () => {
    const { jogadores, rank } = criar([
      ['a', 800, 30],
      ['b', 700, 20],
      ['c', 600, 40],
      ['d', 500, 25],
    ]);
    const tit = ['a', 'b', 'c'].map((id) => jogadores.get(id)!);
    const entram = [jogadores.get('d')!];
    const r = indicadoresDois({ titulares: ['a', 'b', 'c'], entram: ['d'] }, jogadores, rank);
    expect(somaNivel2oTempo(tit, entram)).toBe(r.nivelSoma2oTempo);
  });
});
