import { dividirMeioParaCima } from '../elenco/nivel.js';
import { agregar, trocarNoAgregado, type Agregado } from './indicadores.js';
import { calcularPrevia, composicaoVarios } from './previa.js';
import type { ComposicaoTimesVarios, JogadorSim } from './tipos.js';

/** Teto de trocas aceitas na busca local (ADR-007 §2): garante que o laço termina. */
export const MAX_TROCAS_ACEITAS_VARIOS = 200;

/** Teto de aptos aceitos: a vizinhança da busca local cresce com O(T²·N²) e cada avaliação com O(T). */
export const MAX_APTOS_SIMULADOR = 60;

export interface EntradaDistribuicaoVarios {
  n: number;
  jogadores: readonly JogadorSim[];
  /** Só para teste: substitui `MAX_TROCAS_ACEITAS_VARIOS`. */
  maxTrocas?: number;
}

export interface DistribuicaoVarios extends ComposicaoTimesVarios {
  /** Índice do time incompleto (sempre o último) ou `null` quando todos os times são completos. */
  incompleto: number | null;
}

type Chave = [number, number];

const porId = (a: JogadorSim, b: JogadorSim): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function menor(a: Chave, b: Chave): boolean {
  return a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1];
}

/** `[maior − menor nível médio, maior − menor idade média]`, médias × 100 e inteiras, incluindo o incompleto. */
function chaveDe(agregados: readonly Agregado[]): Chave {
  let nivelMax = -Infinity;
  let nivelMin = Infinity;
  let idadeMax = -Infinity;
  let idadeMin = Infinity;
  for (const ag of agregados) {
    const nivel = dividirMeioParaCima(ag.somaNivel, ag.n);
    const idade = dividirMeioParaCima(100 * ag.somaIdade, ag.n);
    nivelMax = Math.max(nivelMax, nivel);
    nivelMin = Math.min(nivelMin, nivel);
    idadeMax = Math.max(idadeMax, idade);
    idadeMin = Math.min(idadeMin, idade);
  }
  return [nivelMax - nivelMin, idadeMax - idadeMin];
}

/**
 * Distribui os aptos em times de N e, se sobrar gente, um incompleto (RN-10B). Todos são candidatos ao
 * incompleto; o objetivo é a menor diferença de nível médio e depois de idade média. A ordem de chegada
 * não influi: a lista é reordenada por id (RN-09B, I-36).
 */
export function distribuirVariosTimes({
  n,
  jogadores,
  maxTrocas = MAX_TROCAS_ACEITAS_VARIOS,
}: EntradaDistribuicaoVarios): DistribuicaoVarios {
  if (!calcularPrevia({ formato: 'varios_times', n, aptos: jogadores.length }).valida) {
    throw new RangeError(`aptos insuficientes: ${jogadores.length} para 3 ou mais times de ${n}`);
  }
  if (jogadores.length > MAX_APTOS_SIMULADOR) {
    throw new RangeError(`aptos demais: ${jogadores.length} (máximo ${MAX_APTOS_SIMULADOR})`);
  }
  const { times: total, tamanhoIncompleto } = composicaoVarios(jogadores.length, n);
  const capacidade = Array.from({ length: total }, (_, t) =>
    t === total - 1 && tamanhoIncompleto > 0 ? tamanhoIncompleto : n,
  );

  const porNivel = [...jogadores].sort(porId).sort((a, b) => b.nivel - a.nivel);
  const times: JogadorSim[][] = Array.from({ length: total }, () => []);
  let t = 0;
  let passo = 1;
  for (const j of porNivel) {
    while (times[t]!.length >= capacidade[t]!) {
      if (t + passo < 0 || t + passo >= total) passo = -passo;
      else t += passo;
    }
    times[t]!.push(j);
    if (t + passo < 0 || t + passo >= total) passo = -passo;
    else t += passo;
  }

  const mapa = new Map(jogadores.map((j) => [j.id, j]));
  const agregados = times.map((lista) =>
    agregar(
      lista.map((j) => j.id),
      mapa,
    ),
  );
  let chave = chaveDe(agregados);
  let aceitas = 0;
  let melhorou = true;
  while (melhorou && aceitas < maxTrocas) {
    melhorou = false;
    for (let a = 0; a < total && !melhorou; a += 1) {
      for (let b = a + 1; b < total && !melhorou; b += 1) {
        for (let i = 0; i < times[a]!.length && !melhorou; i += 1) {
          for (let j = 0; j < times[b]!.length && !melhorou; j += 1) {
            const deA = times[a]![i]!;
            const deB = times[b]![j]!;
            const antesA = agregados[a]!;
            const antesB = agregados[b]!;
            [agregados[a], agregados[b]] = trocarNoAgregado(antesA, antesB, deA, deB);
            const candidata = chaveDe(agregados);
            if (menor(candidata, chave)) {
              chave = candidata;
              [times[a]![i], times[b]![j]] = [deB, deA];
              melhorou = true;
              aceitas += 1;
            } else {
              agregados[a] = antesA;
              agregados[b] = antesB;
            }
          }
        }
      }
    }
  }

  return {
    times: times.map((lista) => ({
      jogadores: [...lista]
        .sort(porId)
        .sort((x, y) => y.nivel - x.nivel)
        .map((j) => j.id),
    })),
    incompleto: tamanhoIncompleto > 0 ? total - 1 : null,
  };
}
