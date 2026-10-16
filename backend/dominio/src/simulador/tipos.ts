import type { AptoOrdenado } from './classificacao.js';

/** Jogador como o simulador o enxerga: nível × 100 e idade em anos já calculados. */
export interface JogadorSim extends AptoOrdenado {
  nivel: number;
  idade: number;
  semNota: boolean;
}

export interface TimeDois {
  titulares: string[];
  entram: string[];
}

export interface ComposicaoDois {
  times: [TimeDois, TimeDois];
  naoEntra: string[];
}

export interface TimeVarios {
  jogadores: string[];
}

export interface ComposicaoTimesVarios {
  times: TimeVarios[];
}
