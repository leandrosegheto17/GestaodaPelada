import { describe, expect, it } from 'vitest';
import {
  agregar,
  composicaoVarios,
  distribuirVariosTimes,
  MAX_APTOS_SIMULADOR,
  type JogadorSim,
} from '../../src/index.js';

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

  it(`aceita ${MAX_APTOS_SIMULADOR} aptos e rejeita um a mais com RangeError`, () => {
    expect(MAX_APTOS_SIMULADOR).toBe(60);
    const r = distribuirVariosTimes({ n: 5, jogadores: elenco(MAX_APTOS_SIMULADOR) });
    expect(r.times).toHaveLength(12);
    expect(() => distribuirVariosTimes({ n: 5, jogadores: elenco(MAX_APTOS_SIMULADOR + 1) })).toThrow(RangeError);
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
    const amplitudes = (d: typeof r): [number, number] => {
      const ags = d.times.map((t) => agregar(t.jogadores, mapa));
      const nivel = ags.map((g) => g.somaNivel / g.n);
      const idade = ags.map((g) => g.somaIdade / g.n);
      return [Math.max(...nivel) - Math.min(...nivel), Math.max(...idade) - Math.min(...idade)];
    };
    const [nivelFinal, idadeFinal] = amplitudes(r);
    const [nivelInicial, idadeInicial] = amplitudes(semTrocas);
    const naoPiora =
      nivelFinal < nivelInicial - 1e-6 ||
      (Math.abs(nivelFinal - nivelInicial) <= 1e-6 && idadeFinal <= idadeInicial + 1e-6);
    expect(naoPiora).toBe(true);
  });
});

describe('distribuirVariosTimes: ótimo local', () => {
  it.each([0, 5, 11, 17, 23, 31, 40, 49])('elenco %i: nenhuma troca reduz a chave', (c) => {
    const n = 2 + (c % 6);
    const js = elenco(2 * n + 1 + ((c * 5) % 17));
    const mapa = new Map(js.map((j) => [j.id, j]));
    const chave = (times: string[][]): number[] => {
      const ags = times.map((ids) => agregar(ids, mapa));
      const nivel = ags.map((g) => g.somaNivel / g.n);
      const idade = ags.map((g) => g.somaIdade / g.n);
      return [Math.max(...nivel) - Math.min(...nivel), Math.max(...idade) - Math.min(...idade)];
    };
    const times = distribuirVariosTimes({ n, jogadores: js }).times.map((t) => [...t.jogadores]);
    const base = chave(times);
    for (let a = 0; a < times.length; a += 1)
      for (let b = a + 1; b < times.length; b += 1)
        for (let i = 0; i < times[a]!.length; i += 1)
          for (let j = 0; j < times[b]!.length; j += 1) {
            const copia = times.map((t) => [...t]);
            [copia[a]![i], copia[b]![j]] = [times[b]![j]!, times[a]![i]!];
            const k = chave(copia);
            const reduz = k[0]! < base[0]! - 1e-6 || (Math.abs(k[0]! - base[0]!) <= 1e-6 && k[1]! < base[1]! - 1e-6);
            expect(reduz).toBe(false);
          }
  });
});

describe('distribuirVariosTimes: incompleto e determinismo', () => {
  it('todos são candidatos ao incompleto: a menor amplitude de média exige o melhor jogador nele', () => {
    const niveis = [850, 700, 700, 700, 1000, 950, 950, 900];
    const js = niveis.map((nivel, i) => ({ ...elenco(8)[i]!, nivel, idade: 30 }));
    const r = distribuirVariosTimes({ n: 3, jogadores: js });
    const mapa = new Map(js.map((j) => [j.id, j]));
    const medias = r.times.map((t) => agregar(t.jogadores, mapa).somaNivel / t.jogadores.length);
    // Por enumeração de todas as partições 3+3+2, a amplitude mínima é 50/3 e só ocorre com o melhor no time de 2.
    expect(Math.max(...medias) - Math.min(...medias)).toBeCloseTo(50 / 3, 9);
    expect(r.times[r.incompleto!]!.jogadores).toContain('j05');
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
