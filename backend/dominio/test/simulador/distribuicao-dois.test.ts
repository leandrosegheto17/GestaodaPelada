import { describe, expect, it } from 'vitest';
import {
  chaveDaComposicao,
  classificarDoisTimes,
  distribuirDoisTimes,
  type JogadorSim,
  type Limite,
} from '../../src/index.js';

function elenco(quantos: number, so1o: readonly number[] = [], nivelFixo?: number): JogadorSim[] {
  return Array.from({ length: quantos }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    nivel: nivelFixo ?? 300 + ((i * 137) % 600),
    idade: 20 + ((i * 7) % 25),
    so1oTempo: so1o.includes(i + 1),
    semNota: false,
  }));
}

function montar(js: JogadorSim[], n: number, k: Limite, maxTrocas?: number) {
  const classificacao = classificarDoisTimes({ ordem: js, n, k });
  const jogadores = new Map(js.map((j) => [j.id, j]));
  const rank = new Map(js.map((j, i) => [j.id, i]));
  const composicao = distribuirDoisTimes({ classificacao, jogadores, rank, maxTrocas });
  return { classificacao, jogadores, rank, composicao };
}

const casos = Array.from({ length: 60 }, (_, c) => {
  const n = 5 + (c % 7);
  const k: Limite = ([0, 2, 'ilimitado'] as const)[c % 3]!;
  const total = 2 * n + (c % 9);
  const so1o = c % 4 === 0 ? [2, 5, 9].filter((x) => x <= total) : [];
  return { n, k, js: elenco(total, so1o) };
});

describe('distribuirDoisTimes: propriedades', () => {
  it.each(casos.map((c, i) => [i, c] as const))('elenco %i', (_, { n, k, js }) => {
    const { classificacao, jogadores, rank, composicao } = montar(js, n, k);
    const [a, b] = composicao.times;
    expect(a.titulares).toHaveLength(n);
    expect(b.titulares).toHaveLength(n);
    expect(Math.abs(a.entram.length - b.entram.length)).toBeLessThanOrEqual(1);
    const todos = [...a.titulares, ...b.titulares, ...a.entram, ...b.entram, ...composicao.naoEntra];
    expect(new Set(todos).size).toBe(todos.length);
    expect(new Set(todos)).toEqual(new Set(js.map((j) => j.id)));
    expect(new Set([...a.titulares, ...b.titulares])).toEqual(new Set(classificacao.titulares.map((t) => t.id)));
    const serpentina = distribuirDoisTimes({ classificacao, jogadores, rank, maxTrocas: 0 });
    const final = chaveDaComposicao(composicao, n, jogadores, rank);
    const inicial = chaveDaComposicao(serpentina, n, jogadores, rank);
    for (let i = 0; i < final.length; i += 1) {
      if (final[i] !== inicial[i]) {
        expect(final[i]!).toBeLessThan(inicial[i]!);
        break;
      }
    }
  });
});

describe('distribuirDoisTimes: determinismo e referência', () => {
  it('Map de jogadores em ordem diferente e chamadas repetidas dão a mesma composição', () => {
    const js = elenco(19, [4]);
    const { classificacao, rank, composicao } = montar(js, 7, 2);
    const invertido = new Map([...js].reverse().map((j) => [j.id, j]));
    const de = distribuirDoisTimes({ classificacao, jogadores: invertido, rank });
    expect(de).toStrictEqual(composicao);
    expect(montar(js, 7, 2).composicao).toStrictEqual(composicao);
  });

  it('níveis e idades iguais: serpentina, sem trocas', () => {
    const js = elenco(16, [], 500).map((j) => ({ ...j, idade: 30 }));
    const { composicao } = montar(js, 7, 2);
    expect(composicao.times[0].titulares).toEqual(['j01', 'j04', 'j05', 'j08', 'j09', 'j12', 'j13']);
    expect(composicao.times[1].titulares).toEqual(['j02', 'j03', 'j06', 'j07', 'j10', 'j11', 'j14']);
  });

  it('um craque muito acima fica no time que já tem menos nível', () => {
    const js = elenco(14, [], 500);
    js[0] = { ...js[0]!, nivel: 1000 };
    const { composicao, jogadores } = montar(js, 7, 0);
    const soma = (ids: string[]) => ids.reduce((s, id) => s + jogadores.get(id)!.nivel, 0);
    const [a, b] = composicao.times;
    expect(Math.abs(soma(a.titulares) - soma(b.titulares))).toBeLessThanOrEqual(500);
  });

  it('K = 0: ninguém entra', () => {
    const { composicao } = montar(elenco(17), 7, 0);
    expect(composicao.times.every((t) => t.entram.length === 0)).toBe(true);
    expect(composicao.naoEntra).toHaveLength(3);
  });

  it('ótimo local: nenhuma troca titular↔titular melhora a chave final', () => {
    const js = elenco(18, [3]);
    const { composicao, jogadores, rank } = montar(js, 7, 2);
    const base = chaveDaComposicao(composicao, 7, jogadores, rank);
    for (const x of composicao.times[0].titulares) {
      for (const y of composicao.times[1].titulares) {
        const troca = (t: string[], de: string, para: string) => t.map((id) => (id === de ? para : id));
        const outra = {
          ...composicao,
          times: [
            { ...composicao.times[0], titulares: troca(composicao.times[0].titulares, x, y) },
            { ...composicao.times[1], titulares: troca(composicao.times[1].titulares, y, x) },
          ] as typeof composicao.times,
        };
        const chave = chaveDaComposicao(outra, 7, jogadores, rank);
        const melhora = chave.some(
          (v, i) => v !== base[i] && chave.slice(0, i).every((w, m) => w === base[m]) && v < base[i]!,
        );
        expect(melhora).toBe(false);
      }
    }
  });

  it('teto de trocas: com 1 troca aceita ainda devolve composição válida', () => {
    const { composicao } = montar(elenco(19, [4]), 7, 2, 1);
    expect(composicao.times[0].titulares).toHaveLength(7);
    expect(composicao.times[1].titulares).toHaveLength(7);
  });
});
