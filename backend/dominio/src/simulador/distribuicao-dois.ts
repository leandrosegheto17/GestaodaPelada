import type { ClassificacaoDois } from './classificacao.js';
import { dividirMeioParaCima } from '../elenco/nivel.js';
import type { Jogadores } from './indicadores.js';
import type { ComposicaoDois, TimeDois } from './tipos.js';

/** Teto de trocas aceitas na busca local (ADR-007 §2): garante que o laço termina. */
export const MAX_TROCAS_ACEITAS = 200;

export interface EntradaDistribuicaoDois {
  /** Saída de `classificarDoisTimes`, já na ordem de prioridade; não é reordenada nem reclassificada. */
  classificacao: ClassificacaoDois;
  jogadores: Jogadores;
  /** Posição de cada apto na ordem de prioridade (menor = melhor). */
  rank: ReadonlyMap<string, number>;
  /** Só para teste: substitui `MAX_TROCAS_ACEITAS`. */
  maxTrocas?: number;
}

type Chave = [number, number, number, number];

const SERPENTINA = [0, 1, 1, 0];

function menor(a: Chave, b: Chave): boolean {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i]! < b[i]!;
  return false;
}

/**
 * Jogadores do elenco como índices numéricos: o índice é a posição na ordem de prioridade (desempate pelo
 * id), então "pior prioridade" é "índice maior" e a busca local não consulta mapas nem ordena.
 */
interface Elenco {
  ids: string[];
  nivel: number[];
  idade: number[];
  so1o: boolean[];
}

/** Time em índices do `Elenco`. */
interface TimeIdx {
  titulares: number[];
  entram: number[];
}

function elencoDe(idsDosTimes: readonly string[], jogadores: Jogadores, rank: ReadonlyMap<string, number>): Elenco {
  const pos = (id: string): number => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
  const ids = [...idsDosTimes].sort((x, y) => pos(x) - pos(y) || (x < y ? -1 : x > y ? 1 : 0));
  const js = ids.map((id) => jogadores.get(id)!);
  return { ids, nivel: js.map((j) => j.nivel), idade: js.map((j) => j.idade), so1o: js.map((j) => j.so1oTempo) };
}

const idadeMedia = (soma: number, n: number): number => (n > 0 ? dividirMeioParaCima(100 * soma, n) : 0);

/**
 * Chave lexicográfica da composição, só em inteiros: titulares fora de N, excesso de substituições
 * além de 1 de diferença, diferença de nível (1º + 2º tempo) e diferença de idade média.
 *
 * No 2º tempo saem os "só 1º tempo" e, até `max(só 1º tempo, reservas)` saídas, os demais titulares de
 * pior prioridade (mesma regra de `saidaNoIntervalo`); sai-se do pior índice para o melhor sem ordenar.
 */
function chaveDe(times: readonly [TimeIdx, TimeIdx], n: number, e: Elenco): Chave {
  const subs: number[] = [0, 0];
  const nivel1: number[] = [0, 0];
  const nivel2: number[] = [0, 0];
  const idades: number[] = [0, 0];
  const jogam: number[] = [0, 0];
  for (let t = 0; t < 2; t += 1) {
    const { titulares, entram } = times[t]!;
    let n1 = 0;
    let n2 = 0;
    let so1o = 0;
    let idade = 0;
    for (const i of titulares) {
      n1 += e.nivel[i]!;
      idade += e.idade[i]!;
      if (e.so1o[i]) so1o += 1;
      else n2 += e.nivel[i]!;
    }
    for (const i of entram) {
      n2 += e.nivel[i]!;
      idade += e.idade[i]!;
    }
    const total = Math.min(Math.max(so1o, entram.length), titulares.length);
    let teto = Number.MAX_SAFE_INTEGER;
    for (let k = total - so1o; k > 0; k -= 1) {
      let pior = -1;
      for (const i of titulares) if (!e.so1o[i] && i < teto && i > pior) pior = i;
      n2 -= e.nivel[pior]!;
      teto = pior;
    }
    subs[t] = Math.min(total, entram.length);
    nivel1[t] = n1;
    nivel2[t] = n2;
    idades[t] = idade;
    jogam[t] = titulares.length + entram.length;
  }
  const violaN = Number(times[0].titulares.length !== n) + Number(times[1].titulares.length !== n);
  const excessoSubs = Math.max(0, Math.abs(subs[0]! - subs[1]!) - 1);
  const difNivel = Math.abs(nivel1[0]! - nivel1[1]!) + Math.abs(nivel2[0]! - nivel2[1]!);
  return [
    violaN,
    excessoSubs,
    difNivel,
    Math.abs(idadeMedia(idades[0]!, jogam[0]!) - idadeMedia(idades[1]!, jogam[1]!)),
  ];
}

/**
 * Distribui titulares e reservas entre os dois times (RN-10A): serpentina pela prioridade e, depois,
 * trocas entre times em ordem fixa, aceitando a primeira que melhora a chave. Determinística.
 */
export function distribuirDoisTimes({
  classificacao,
  jogadores,
  rank,
  maxTrocas = MAX_TROCAS_ACEITAS,
}: EntradaDistribuicaoDois): ComposicaoDois {
  const n = classificacao.titulares.length / 2;
  const elenco = elencoDe(
    [...classificacao.titulares, ...classificacao.reservasQueEntram].map((j) => j.id),
    jogadores,
    rank,
  );
  const indice = new Map(elenco.ids.map((id, i) => [id, i]));
  const a: TimeIdx = { titulares: [], entram: [] };
  const b: TimeIdx = { titulares: [], entram: [] };
  classificacao.titulares.forEach((t, i) => (SERPENTINA[i % 4] === 0 ? a : b).titulares.push(indice.get(t.id)!));
  classificacao.reservasQueEntram.forEach((r, i) => (i % 2 === 0 ? a : b).entram.push(indice.get(r.id)!));
  const times: [TimeIdx, TimeIdx] = [a, b];

  let chave = chaveDe(times, n, elenco);
  let aceitas = 0;
  let melhorou = true;
  while (melhorou && aceitas < maxTrocas) {
    melhorou = false;
    for (const categoria of ['titulares', 'entram'] as const) {
      const la = a[categoria];
      const lb = b[categoria];
      for (let i = 0; i < la.length && !melhorou; i += 1) {
        for (let j = 0; j < lb.length && !melhorou; j += 1) {
          [la[i], lb[j]] = [lb[j]!, la[i]!];
          const candidata = chaveDe(times, n, elenco);
          if (menor(candidata, chave)) {
            chave = candidata;
            melhorou = true;
            aceitas += 1;
          } else {
            [la[i], lb[j]] = [lb[j]!, la[i]!];
          }
        }
      }
      if (melhorou) break;
    }
  }

  // índices crescentes já são a ordem de prioridade
  const ordenado = (t: TimeIdx): TimeDois => ({
    titulares: [...t.titulares].sort((x, y) => x - y).map((i) => elenco.ids[i]!),
    entram: [...t.entram].sort((x, y) => x - y).map((i) => elenco.ids[i]!),
  });
  return { times: [ordenado(a), ordenado(b)], naoEntra: classificacao.naoEntra.map((x) => x.id) };
}

/** Chave da composição, exposta para conferir ótimo local e comparação com a serpentina. */
export function chaveDaComposicao(
  composicao: ComposicaoDois,
  n: number,
  jogadores: Jogadores,
  rank: ReadonlyMap<string, number>,
): readonly number[] {
  const todos = composicao.times.flatMap((t) => [...t.titulares, ...t.entram]);
  const elenco = elencoDe(todos, jogadores, rank);
  const indice = new Map(elenco.ids.map((id, i) => [id, i]));
  const emIndices = (t: TimeDois): TimeIdx => ({
    titulares: t.titulares.map((id) => indice.get(id)!),
    entram: t.entram.map((id) => indice.get(id)!),
  });
  return chaveDe([emIndices(composicao.times[0]), emIndices(composicao.times[1])], n, elenco);
}
