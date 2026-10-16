import { describe, expect, it } from 'vitest';
import { sugerir, type EntradaSugerir } from '../../src/index.js';
import { elencoSim, historicoSim } from './apoio.js';

function entrada(
  sobre: Partial<EntradaSugerir> & Pick<EntradaSugerir, 'formato' | 'n'>,
  quantos: number,
): EntradaSugerir {
  const aptos = elencoSim(
    quantos,
    [4],
    [18, 19].filter((x) => x <= quantos),
  );
  return { k: 2, dataPartida: '2026-10-22', aptos, historico: historicoSim(aptos), ...sobre };
}

describe('sugerir: dois times', () => {
  const e = entrada({ formato: 'dois_times', n: 7 }, 19);

  it('19 aptos, N=7, K=2: 14 titulares, 4 reservas, 1 fora e avisos de sem nota', () => {
    const r = sugerir(e);
    if (!r.valida || r.formato !== 'dois_times') throw new Error('esperava dois times válidos');
    expect(r.ordemPrioridade).toHaveLength(19);
    expect(r.composicao.times.map((t) => t.titulares.length)).toEqual([7, 7]);
    expect(r.composicao.times.reduce((s, t) => s + t.entram.length, 0)).toBe(4);
    expect(r.composicao.naoEntra).toEqual([r.ordemPrioridade[18]]);
    const semNota = r.avisos.find((a) => a.tipo === 'sem_nota');
    expect(semNota?.tipo === 'sem_nota' && [...semNota.ids].sort()).toEqual(['j18', 'j19']);
    expect(Math.abs(r.indicadores[0].substituicoes - r.indicadores[1].substituicoes)).toBeLessThanOrEqual(1);
  });

  it('todos os aptos são alocados exatamente uma vez', () => {
    const r = sugerir(e);
    if (!r.valida || r.formato !== 'dois_times') throw new Error('esperava dois times válidos');
    const ids = [...r.composicao.times.flatMap((t) => [...t.titulares, ...t.entram]), ...r.composicao.naoEntra];
    expect(new Set(ids).size).toBe(19);
  });

  it('aptos e histórico em ordens diferentes dão a mesma sugestão', () => {
    const base = sugerir(e);
    const inverso = sugerir({
      ...e,
      aptos: [...e.aptos].reverse(),
      historico: {
        ...e.historico,
        jogadores: [...e.historico.jogadores].reverse(),
        presencas: [...e.historico.presencas].reverse(),
      },
    });
    const rotacionado = sugerir({ ...e, aptos: [...e.aptos.slice(5), ...e.aptos.slice(0, 5)] });
    expect(inverso).toStrictEqual(base);
    expect(rotacionado).toStrictEqual(base);
    expect(sugerir(e)).toStrictEqual(base);
  });

  it('aptos insuficientes devolvem a prévia inválida', () => {
    const r = sugerir(entrada({ formato: 'dois_times', n: 7 }, 13));
    expect(r.valida).toBe(false);
  });
});

describe('sugerir: vários times', () => {
  const e = entrada({ formato: 'varios_times', n: 4 }, 22);

  it('22 aptos, N=4: 5 times de 4 e o incompleto de 2 por último', () => {
    const r = sugerir(e);
    if (!r.valida || r.formato !== 'varios_times') throw new Error('esperava vários times válidos');
    expect(r.composicao.times.map((t) => t.jogadores.length)).toEqual([4, 4, 4, 4, 4, 2]);
    expect(r.composicao.incompleto).toBe(5);
    expect(r.indicadores.map((i) => i.jogadores)).toEqual([4, 4, 4, 4, 4, 2]);
    expect(r.avisos.map((a) => a.tipo)).toEqual(['sem_nota']);
  });

  it('a ordem dos aptos não muda o resultado', () => {
    expect(sugerir({ ...e, aptos: [...e.aptos].reverse() })).toStrictEqual(sugerir(e));
  });

  it('8 aptos com N=4 é insuficiente', () => {
    expect(sugerir(entrada({ formato: 'varios_times', n: 4 }, 8)).valida).toBe(false);
  });
});
