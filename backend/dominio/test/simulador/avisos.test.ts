import { describe, expect, it } from 'vitest';
import { avisosDois, avisosVarios, type AvisoSim, type JogadorSim } from '../../src/index.js';

const sim = (id: string, extra: Partial<JogadorSim> = {}): JogadorSim => ({
  id,
  nivel: 500,
  idade: 30,
  so1oTempo: false,
  semNota: false,
  ...extra,
});
const lista = (prefixo: string, quantos: number, extra: Partial<JogadorSim> = {}) =>
  Array.from({ length: quantos }, (_, i) => sim(`${prefixo}${i + 1}`, extra));
const ids = (js: JogadorSim[]) => js.map((j) => j.id);
const mapa = (js: JogadorSim[]) => new Map(js.map((j) => [j.id, j]));
const rankDe = (js: JogadorSim[]) => new Map(js.map((j, i) => [j.id, i]));

describe('avisosDois', () => {
  const a = lista('a', 3);
  const b = lista('b', 3);
  const reservas = lista('r', 3);
  const todos = [...a, ...b, ...reservas];
  const base = {
    n: 3,
    jogadores: mapa(todos),
    rank: rankDe(todos),
  };
  const comp = (entramA: string[], entramB: string[]) => ({
    times: [
      { titulares: ids(a), entram: entramA },
      { titulares: ids(b), entram: entramB },
    ] as [{ titulares: string[]; entram: string[] }, { titulares: string[]; entram: string[] }],
    naoEntra: [],
  });

  it('sugestão intacta não tem avisos', () => {
    expect(avisosDois({ ...base, comp: comp(['r1'], ['r2']) })).toEqual([]);
  });

  it('(a) 2 só 1º tempo e 1 entrando → faltam 1; 1 e 1 → nada', () => {
    const j = mapa([
      ...todos.filter((x) => !['a1', 'a2', 'b1'].includes(x.id)),
      sim('a1', { so1oTempo: true }),
      sim('a2', { so1oTempo: true }),
      sim('b1', { so1oTempo: true }),
    ]);
    const avisos = avisosDois({ ...base, jogadores: j, comp: comp(['r1'], ['r2']) });
    expect(avisos).toEqual<AvisoSim[]>([{ tipo: 'so_1o_tempo_sem_reserva', time: 0, faltam: 1 }]);
  });

  it('(a) K = 0 com 1 só 1º tempo → aviso', () => {
    const j = mapa([...todos.filter((x) => x.id !== 'a1'), sim('a1', { so1oTempo: true })]);
    expect(avisosDois({ ...base, jogadores: j, comp: comp([], []) })).toEqual<AvisoSim[]>([
      { tipo: 'so_1o_tempo_sem_reserva', time: 0, faltam: 1 },
    ]);
  });

  it('(b) A com 4 e B com 2 titulares → composição diferente nos dois times', () => {
    const ajustada = {
      times: [
        { titulares: [...ids(a), 'b3'], entram: [] },
        { titulares: ['b1', 'b2'], entram: [] },
      ] as [{ titulares: string[]; entram: string[] }, { titulares: string[]; entram: string[] }],
      naoEntra: [],
    };
    expect(avisosDois({ ...base, comp: ajustada })).toEqual<AvisoSim[]>([
      { tipo: 'composicao_diferente', times: [0, 1] },
    ]);
  });

  it('(c) sem nota em ordem de prioridade', () => {
    const j = mapa(todos.map((x) => (['r2', 'a3'].includes(x.id) ? { ...x, semNota: true } : x)));
    const avisos = avisosDois({ ...base, jogadores: j, comp: comp(['r1'], ['r2']) });
    expect(avisos).toEqual<AvisoSim[]>([{ tipo: 'sem_nota', ids: ['a3', 'r2'] }]);
  });
});

describe('avisosVarios', () => {
  const montar = (aptos: number, n: number, tamanhos: number[]) => {
    const js = lista('j', aptos);
    let inicio = 0;
    const times = tamanhos.map((q) => {
      const t = { jogadores: ids(js.slice(inicio, inicio + q)) };
      inicio += q;
      return t;
    });
    return { n, jogadores: mapa(js), comp: { times } };
  };

  it.each([
    [9, 4, [4, 4, 1], 1],
    [21, 4, [4, 4, 4, 4, 4, 1], 1],
  ])('(d) %i/%i: incompleto de %i → aviso', (aptos, n, tamanhos, resto) => {
    const avisos = avisosVarios(montar(aptos, n, tamanhos));
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ tipo: 'incompleto_pequeno', tamanho: resto });
  });

  it('(d) 22/4: resto 2 = N/2, não avisa; sem incompleto também não', () => {
    expect(avisosVarios(montar(22, 4, [4, 4, 4, 4, 4, 2]))).toEqual([]);
    expect(avisosVarios(montar(20, 4, [4, 4, 4, 4, 4]))).toEqual([]);
  });

  it('(d) sugere até 2 outros N que não deixam incompleto pequeno', () => {
    const [aviso] = avisosVarios(montar(9, 4, [4, 4, 1]));
    expect(aviso).toEqual({ tipo: 'incompleto_pequeno', tamanho: 1, nSugeridos: [3, 2] });
  });

  it('(d) nenhum N alternativo válido → lista vazia', () => {
    const [aviso] = avisosVarios(montar(5, 2, [2, 2, 1]));
    expect(aviso).toMatchObject({ tipo: 'incompleto_pequeno', nSugeridos: [] });
  });

  it('(b) dois incompletos ou um time com N+1 → composição diferente', () => {
    expect(avisosVarios(montar(10, 4, [4, 3, 3]))).toContainEqual({ tipo: 'composicao_diferente', times: [1, 2] });
    expect(avisosVarios(montar(10, 4, [5, 4, 1]))).toContainEqual({ tipo: 'composicao_diferente', times: [0, 2] });
  });

  it('(c) sem nota', () => {
    const entrada = montar(12, 4, [4, 4, 4]);
    const jogadores = new Map(entrada.jogadores);
    jogadores.set('j3', sim('j3', { semNota: true }));
    expect(avisosVarios({ ...entrada, jogadores })).toEqual<AvisoSim[]>([{ tipo: 'sem_nota', ids: ['j3'] }]);
  });

  it('nenhum tipo de aviso fala de goleiro', () => {
    const tipos = ['so_1o_tempo_sem_reserva', 'composicao_diferente', 'sem_nota', 'incompleto_pequeno'];
    expect(tipos.some((t) => /goleiro|posicao/i.test(t))).toBe(false);
  });
});
