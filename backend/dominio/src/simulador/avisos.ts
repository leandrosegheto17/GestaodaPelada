import { indicadoresDois, type Jogadores } from './indicadores.js';
import { calcularPrevia, composicaoVarios } from './previa.js';
import type { ComposicaoDois, ComposicaoTimesVarios } from './tipos.js';

/**
 * Avisos do simulador (RF-47). Avisos não bloqueiam a confirmação, não montam texto (isso é do adaptador)
 * e não expõem nível: só ids e contagens. Não há aviso sobre goleiros nem posições.
 */
export type AvisoSim =
  | { tipo: 'so_1o_tempo_sem_reserva'; time: number; faltam: number }
  | { tipo: 'composicao_diferente'; times: number[] }
  | { tipo: 'sem_nota'; ids: string[] }
  | { tipo: 'incompleto_pequeno'; tamanho: number; nSugeridos: number[] };

/** Quantos valores de N alternativos são examinados no máximo (limita o laço). */
const MAX_ALTERNATIVAS = 30;
const MAX_SUGESTOES = 2;

const porId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function semNota(ids: readonly string[], jogadores: Jogadores, rank?: ReadonlyMap<string, number>): AvisoSim[] {
  const pos = (id: string): number => rank?.get(id) ?? Number.MAX_SAFE_INTEGER;
  const sem = ids.filter((id) => jogadores.get(id)?.semNota).sort((a, b) => pos(a) - pos(b) || porId(a, b));
  return sem.length > 0 ? [{ tipo: 'sem_nota', ids: sem }] : [];
}

export interface EntradaAvisosDois {
  n: number;
  comp: ComposicaoDois;
  jogadores: Jogadores;
  rank: ReadonlyMap<string, number>;
}

/** (a) titulares "só 1º tempo" além dos reservas que entram; (b) composição diferente da prevista; (c) sem nota. */
export function avisosDois({ n, comp, jogadores, rank }: EntradaAvisosDois): AvisoSim[] {
  const avisos: AvisoSim[] = [];
  comp.times.forEach((time, indice) => {
    const so1o = time.titulares.filter((id) => jogadores.get(id)?.so1oTempo).length;
    if (so1o > time.entram.length)
      avisos.push({ tipo: 'so_1o_tempo_sem_reserva', time: indice, faltam: so1o - time.entram.length });
  });

  const diferentes: number[] = [];
  comp.times.forEach((time, indice) => {
    const ind = indicadoresDois(time, jogadores, rank);
    if (time.titulares.length !== n || ind.entraSemPar.length > 0) diferentes.push(indice);
  });
  if (diferentes.length > 0) avisos.push({ tipo: 'composicao_diferente', times: diferentes });

  const todos = [...comp.times.flatMap((t) => [...t.titulares, ...t.entram]), ...comp.naoEntra];
  return [...avisos, ...semNota(todos, jogadores, rank)];
}

export interface EntradaAvisosVarios {
  n: number;
  comp: ComposicaoTimesVarios;
  jogadores: Jogadores;
}

/** Outros N próximos do atual (N−1, N+1, N−2, …) que formam 3 times e não deixam incompleto pequeno. */
function nAlternativos(n: number, aptos: number): number[] {
  const maximo = Math.floor((aptos - 1) / 2);
  const sugeridos: number[] = [];
  for (let distancia = 1; distancia <= MAX_ALTERNATIVAS && sugeridos.length < MAX_SUGESTOES; distancia += 1) {
    for (const candidato of [n - distancia, n + distancia]) {
      if (candidato < 2 || candidato > maximo || sugeridos.length >= MAX_SUGESTOES) continue;
      if (!calcularPrevia({ formato: 'varios_times', n: candidato, aptos }).valida) continue;
      const resto = composicaoVarios(aptos, candidato).tamanhoIncompleto;
      if (resto === 0 || 2 * resto >= candidato) sugeridos.push(candidato);
    }
  }
  return sugeridos;
}

/** (b) mais de um time incompleto ou algum acima de N; (c) sem nota; (d) incompleto com menos de N/2. */
export function avisosVarios({ n, comp, jogadores }: EntradaAvisosVarios): AvisoSim[] {
  const avisos: AvisoSim[] = [];
  const tamanhos = comp.times.map((t) => t.jogadores.length);
  const incompletos = tamanhos.filter((q) => q < n).length;
  if (incompletos > 1 || tamanhos.some((q) => q > n)) {
    avisos.push({ tipo: 'composicao_diferente', times: tamanhos.flatMap((q, i) => (q !== n ? [i] : [])) });
  }
  const ids = comp.times.flatMap((t) => t.jogadores);
  avisos.push(...semNota(ids, jogadores));
  const resto = composicaoVarios(ids.length, n).tamanhoIncompleto;
  if (resto > 0 && 2 * resto < n) {
    avisos.push({ tipo: 'incompleto_pequeno', tamanho: resto, nSugeridos: nAlternativos(n, ids.length) });
  }
  return avisos;
}
