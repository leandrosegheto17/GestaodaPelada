import { describe, expect, it } from 'vitest';
import { agregar, composicaoVarios, distribuirVariosTimes, type JogadorSim } from '../../src/index.js';

function elenco(quantos: number, nivelFixo?: number, idadeFixa?: number): JogadorSim[] {
  return Array.from({ length: quantos }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    nivel: nivelFixo ?? 300 + ((i * 137) % 600),
    idade: idadeFixa ?? 20 + ((i * 7) % 25),
    so1oTempo: false,
    semNota: false,
  }));
}

const tamanhos = (js: JogadorSim[], n: number) =>
  distribuirVariosTimes({ n, jogadores: js }).times.map((t) => t.jogadores.length);

describe('distribuirVariosTimes: tamanhos', () => {
  it('22 aptos, N=4: cinco times de 4 e um de 2', () => {
    expect(tamanhos(elenco(22), 4)).toEqual([4, 4, 4, 4, 4, 2]);
  });

  it('20 aptos, N=4: cinco times de 4, sem incompleto', () => {
    const r = distribuirVariosTimes({ n: 4, jogadores: elenco(20) });
    expect(r.times.map((t) => t.jogadores.length)).toEqual([4, 4, 4, 4, 4]);
    expect(r.incompleto).toBeNull();
  });

  it('9 aptos, N=4: dois de 4 e um de 1', () => {
    const r = distribuirVariosTimes({ n: 4, jogadores: elenco(9) });
    expect(r.times.map((t) => t.jogadores.length)).toEqual([4, 4, 1]);
    expect(r.incompleto).toBe(2);
  });

  it('sem aptos para 3 times lança RangeError', () => {
    expect(() => distribuirVariosTimes({ n: 4, jogadores: elenco(8) })).toThrow(RangeError);
  });
});

describe('distribuirVariosTimes: propriedades', () => {
  const casos = Array.from({ length: 50 }, (_, c) => ({
    n: 2 + (c % 6),
    aptos: 2 * (2 + (c % 6)) + 1 + ((c * 5) % 17),
  }));

  it.each(casos.map((c, i) => [i, c] as const))('elenco %i', (_, { n, aptos }) => {
    const js = elenco(aptos);
    const r = distribuirVariosTimes({ n, jogadores: js });
    const ids = r.times.flatMap((t) => t.jogadores);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(js.map((j) => j.id)));
    const esperado = composicaoVarios(aptos, n);
    expect(r.times).toHaveLength(esperado.times);
    expect(r.times.filter((t) => t.jogadores.length < n)).toHaveLength(esperado.tamanhoIncompleto > 0 ? 1 : 0);

    const semTrocas = distribuirVariosTimes({ n, jogadores: js, maxTrocas: 0 });
    const mapa = new Map(js.map((j) => [j.id, j]));
    const amplitude = (d: typeof r) => {
      const medias = d.times.map((t) => {
        const ag = agregar(t.jogadores, mapa);
        return ag.somaNivel / ag.n;
      });
      return Math.max(...medias) - Math.min(...medias);
    };
    expect(amplitude(r)).toBeLessThanOrEqual(amplitude(semTrocas) + 1e-9);
  });
});

describe('distribuirVariosTimes: incompleto e determinismo', () => {
  it('o melhor jogador pode ficar no incompleto quando isso equilibra a média', () => {
    const js = elenco(9, 500, 30);
    js[0] = { ...js[0]!, nivel: 900 };
    const r = distribuirVariosTimes({ n: 4, jogadores: js });
    const incompleto = r.times[r.incompleto!]!;
    expect(incompleto.jogadores).toContain('j01');
  });

  it('a lista embaralhada por permutações fixas dá a mesma saída', () => {
    const js = elenco(22);
    const base = distribuirVariosTimes({ n: 4, jogadores: js });
    const rotacionada = [...js.slice(7), ...js.slice(0, 7)];
    const invertida = [...js].reverse();
    expect(distribuirVariosTimes({ n: 4, jogadores: rotacionada })).toStrictEqual(base);
    expect(distribuirVariosTimes({ n: 4, jogadores: invertida })).toStrictEqual(base);
  });

  it('níveis e idades iguais: nenhuma troca muda as médias', () => {
    const js = elenco(14, 500, 30);
    const r = distribuirVariosTimes({ n: 4, jogadores: js });
    expect(r.times.map((t) => t.jogadores.length)).toEqual([4, 4, 4, 2]);
  });
});
