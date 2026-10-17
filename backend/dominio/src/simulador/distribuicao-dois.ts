import { saidaNoIntervalo, type ClassificacaoDois } from './classificacao.js';
import { dividirMeioParaCima } from '../elenco/nivel.js';
import { agregar, somaNivel2oTempo, trocarNoAgregado, type Agregado, type Jogadores } from './indicadores.js';
import type { ComposicaoDois, JogadorSim, TimeDois } from './tipos.js';

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

/** Acumulados de um time que a troca atualiza em O(1): nível dos titulares e idade de quem joga. */
interface Estado {
  titulares: Agregado;
  jogam: Agregado;
}

function ordenarPorRank(ids: readonly string[], jogadores: Jogadores, rank: ReadonlyMap<string, number>): JogadorSim[] {
  const pos = (id: string): number => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [...ids].sort((x, y) => pos(x) - pos(y) || (x < y ? -1 : x > y ? 1 : 0)).map((id) => jogadores.get(id)!);
}

/** Substituições do time: pares entre quem sai no intervalo e quem entra. */
function substituicoes(time: TimeDois, jogadores: Jogadores): number {
  const saem = saidaNoIntervalo(
    time.titulares.map((id) => jogadores.get(id)!),
    time.entram.length,
  );
  return Math.min(saem.length, time.entram.length);
}

const idadeMedia = (e: Estado): number => (e.jogam.n > 0 ? dividirMeioParaCima(100 * e.jogam.somaIdade, e.jogam.n) : 0);

/**
 * Chave lexicográfica da composição, só em inteiros: titulares fora de N, excesso de substituições
 * além de 1 de diferença, diferença de nível (1º + 2º tempo) e diferença de idade média.
 */
function chaveDe(
  times: [TimeDois, TimeDois],
  n: number,
  [ea, eb]: [Estado, Estado],
  jogadores: Jogadores,
  rank: ReadonlyMap<string, number>,
): Chave {
  const violaN = Number(times[0].titulares.length !== n) + Number(times[1].titulares.length !== n);
  const excessoSubs = Math.max(
    0,
    Math.abs(substituicoes(times[0], jogadores) - substituicoes(times[1], jogadores)) - 1,
  );
  const nivel2 = (t: TimeDois): number =>
    somaNivel2oTempo(ordenarPorRank(t.titulares, jogadores, rank), ordenarPorRank(t.entram, jogadores, rank));
  const difNivel =
    Math.abs(ea.titulares.somaNivel - eb.titulares.somaNivel) + Math.abs(nivel2(times[0]) - nivel2(times[1]));
  return [violaN, excessoSubs, difNivel, Math.abs(idadeMedia(ea) - idadeMedia(eb))];
}

function estadoDe(t: TimeDois, jogadores: Jogadores): Estado {
  return { titulares: agregar(t.titulares, jogadores), jogam: agregar([...t.titulares, ...t.entram], jogadores) };
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
  const a: TimeDois = { titulares: [], entram: [] };
  const b: TimeDois = { titulares: [], entram: [] };
  classificacao.titulares.forEach((t, i) => (SERPENTINA[i % 4] === 0 ? a : b).titulares.push(t.id));
  classificacao.reservasQueEntram.forEach((r, i) => (i % 2 === 0 ? a : b).entram.push(r.id));
  const times: [TimeDois, TimeDois] = [a, b];

  let estado: [Estado, Estado] = [estadoDe(a, jogadores), estadoDe(b, jogadores)];
  let chave = chaveDe(times, n, estado, jogadores, rank);
  let aceitas = 0;
  let melhorou = true;
  while (melhorou && aceitas < maxTrocas) {
    melhorou = false;
    for (const categoria of ['titulares', 'entram'] as const) {
      const la = a[categoria];
      const lb = b[categoria];
      for (let i = 0; i < la.length && !melhorou; i += 1) {
        for (let j = 0; j < lb.length && !melhorou; j += 1) {
          const deA = jogadores.get(la[i]!)!;
          const deB = jogadores.get(lb[j]!)!;
          const [ta, tb] = trocarNoAgregado(estado[0].jogam, estado[1].jogam, deA, deB);
          const [na, nb] =
            categoria === 'titulares'
              ? trocarNoAgregado(estado[0].titulares, estado[1].titulares, deA, deB)
              : [estado[0].titulares, estado[1].titulares];
          [la[i], lb[j]] = [lb[j]!, la[i]!];
          const proximo: [Estado, Estado] = [
            { titulares: na, jogam: ta },
            { titulares: nb, jogam: tb },
          ];
          const candidata = chaveDe(times, n, proximo, jogadores, rank);
          if (menor(candidata, chave)) {
            chave = candidata;
            estado = proximo;
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

  const porRank = (x: string, y: string): number =>
    (rank.get(x) ?? Number.MAX_SAFE_INTEGER) - (rank.get(y) ?? Number.MAX_SAFE_INTEGER) || (x < y ? -1 : x > y ? 1 : 0);
  const ordenado = (t: TimeDois): TimeDois => ({
    titulares: [...t.titulares].sort(porRank),
    entram: [...t.entram].sort(porRank),
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
  return chaveDe(
    composicao.times,
    n,
    [estadoDe(composicao.times[0], jogadores), estadoDe(composicao.times[1], jogadores)],
    jogadores,
    rank,
  );
}
