import type { ClassificacaoDois } from './classificacao.js';
import { indicadoresDois, type Jogadores } from './indicadores.js';
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
 * Chave lexicográfica da composição, só em inteiros: titulares fora de N, excesso de substituições
 * além de 1 de diferença, diferença de nível (1º + 2º tempo) e diferença de idade média.
 */
function chaveDe(
  times: [TimeDois, TimeDois],
  n: number,
  jogadores: Jogadores,
  rank: ReadonlyMap<string, number>,
): Chave {
  const [a, b] = [indicadoresDois(times[0], jogadores, rank), indicadoresDois(times[1], jogadores, rank)];
  const violaN = Number(times[0].titulares.length !== n) + Number(times[1].titulares.length !== n);
  const excessoSubs = Math.max(0, Math.abs(a.substituicoes - b.substituicoes) - 1);
  const difNivel =
    Math.abs(a.nivelSoma1oTempo - b.nivelSoma1oTempo) + Math.abs(a.nivelSoma2oTempo - b.nivelSoma2oTempo);
  const difIdade = Math.abs((a.idadeMedia ?? 0) - (b.idadeMedia ?? 0));
  return [violaN, excessoSubs, difNivel, difIdade];
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

  let chave = chaveDe(times, n, jogadores, rank);
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
          const candidata = chaveDe(times, n, jogadores, rank);
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
  return chaveDe(composicao.times, n, jogadores, rank);
}
