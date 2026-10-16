import { dividirMeioParaCima } from '../elenco/nivel.js';
import { saidaNoIntervalo } from './classificacao.js';
import type { ComposicaoTimesVarios, JogadorSim, TimeDois } from './tipos.js';

export interface ParTroca {
  sai: string;
  entra: string;
}

export interface IndicadoresDois {
  jogadores1oTempo: number;
  jogadores2oTempo: number;
  nivelSoma1oTempo: number;
  /** Nível médio × 100; `null` se ninguém joga naquele tempo. */
  nivelMedio1oTempo: number | null;
  nivelSoma2oTempo: number;
  nivelMedio2oTempo: number | null;
  /** Idade média × 100 de quem joga pelo time (titulares + quem entra). */
  idadeMedia: number | null;
  substituicoes: number;
  /** Quem sai no intervalo, na ordem de saída. */
  saem: string[];
  pares: ParTroca[];
  saiSemPar: string[];
  entraSemPar: string[];
}

export interface IndicadoresVarios {
  jogadores: number;
  nivelSoma: number;
  nivelMedio: number | null;
  idadeMedia: number | null;
}

export type Jogadores = ReadonlyMap<string, JogadorSim>;

function buscar(jogadores: Jogadores, id: string): JogadorSim {
  const j = jogadores.get(id);
  if (!j) throw new Error(`jogador fora do simulador: ${id}`);
  return j;
}

const media = (soma: number, quantos: number): number | null =>
  quantos > 0 ? dividirMeioParaCima(soma, quantos) : null;

function somaNivel(jogadores: Jogadores, ids: readonly string[]): number {
  let soma = 0;
  for (const id of ids) soma += buscar(jogadores, id).nivel;
  return soma;
}

/**
 * Indicadores de um time no formato "2 times". `rank` dá a posição de cada apto na ordem de prioridade
 * (menor = melhor); titulares e quem entra são ordenados por ela antes de derivar quem sai.
 */
export function indicadoresDois(
  time: TimeDois,
  jogadores: Jogadores,
  rank: ReadonlyMap<string, number>,
): IndicadoresDois {
  const pos = (id: string): number => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
  const porRank = (a: string, b: string): number => pos(a) - pos(b) || (a < b ? -1 : a > b ? 1 : 0);
  const titulares = [...time.titulares].sort(porRank);
  const entram = [...time.entram].sort(porRank);
  const saem = saidaNoIntervalo(
    titulares.map((id) => buscar(jogadores, id)),
    entram.length,
  );
  const saemSet = new Set(saem);
  const segundoTempo = [...titulares.filter((id) => !saemSet.has(id)), ...entram];
  const nivel1 = somaNivel(jogadores, titulares);
  const nivel2 = somaNivel(jogadores, segundoTempo);
  const quemJoga = [...titulares, ...entram];
  let somaIdade = 0;
  for (const id of quemJoga) somaIdade += buscar(jogadores, id).idade;
  const pares: ParTroca[] = [];
  const total = Math.min(saem.length, entram.length);
  for (let i = 0; i < total; i += 1) pares.push({ sai: saem[i]!, entra: entram[i]! });
  return {
    jogadores1oTempo: titulares.length,
    jogadores2oTempo: segundoTempo.length,
    nivelSoma1oTempo: nivel1,
    nivelMedio1oTempo: media(nivel1, titulares.length),
    nivelSoma2oTempo: nivel2,
    nivelMedio2oTempo: media(nivel2, segundoTempo.length),
    idadeMedia: media(100 * somaIdade, quemJoga.length),
    substituicoes: pares.length,
    saem,
    pares,
    saiSemPar: saem.slice(total),
    entraSemPar: entram.slice(total),
  };
}

/** Indicadores por time no formato "3 ou mais times" (sem tempos). */
export function indicadoresVarios(composicao: ComposicaoTimesVarios, jogadores: Jogadores): IndicadoresVarios[] {
  return composicao.times.map(({ jogadores: ids }) => {
    const ag = agregar(ids, jogadores);
    return {
      jogadores: ag.n,
      nivelSoma: ag.somaNivel,
      nivelMedio: media(ag.somaNivel, ag.n),
      idadeMedia: media(100 * ag.somaIdade, ag.n),
    };
  });
}

/** Totais de um time, para avaliar uma troca sem percorrer o time inteiro. */
export interface Agregado {
  n: number;
  somaNivel: number;
  somaIdade: number;
}

export function agregar(ids: readonly string[], jogadores: Jogadores): Agregado {
  let nivel = 0;
  let idade = 0;
  for (const id of ids) {
    const j = buscar(jogadores, id);
    nivel += j.nivel;
    idade += j.idade;
  }
  return { n: ids.length, somaNivel: nivel, somaIdade: idade };
}

/** Troca em O(1): `deA` vai do time A para o B e `deB` do B para o A. */
export function trocarNoAgregado(a: Agregado, b: Agregado, deA: JogadorSim, deB: JogadorSim): [Agregado, Agregado] {
  return [
    { n: a.n, somaNivel: a.somaNivel - deA.nivel + deB.nivel, somaIdade: a.somaIdade - deA.idade + deB.idade },
    { n: b.n, somaNivel: b.somaNivel - deB.nivel + deA.nivel, somaIdade: b.somaIdade - deB.idade + deA.idade },
  ];
}

/** Soma de níveis no 2º tempo de um time: titulares que ficam (saem os de `saidaNoIntervalo`) mais quem entra. */
export function somaNivel2oTempo(titularesOrdenados: readonly JogadorSim[], entram: readonly JogadorSim[]): number {
  const saem = new Set(saidaNoIntervalo(titularesOrdenados, entram.length));
  let soma = 0;
  for (const t of titularesOrdenados) if (!saem.has(t.id)) soma += t.nivel;
  for (const e of entram) soma += e.nivel;
  return soma;
}
