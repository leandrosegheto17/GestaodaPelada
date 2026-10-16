/**
 * Classificação dos aptos em "2 times" (RN-09A). A entrada já vem na ordem de prioridade e não é
 * reordenada aqui. Os aptos em `naoEntra` compareceram: contam como presentes na pré-marcação
 * (RN-19, RF-26), nunca como falta; quem marca a presença é quem pré-marca.
 */

export interface AptoOrdenado {
  id: string;
  so1oTempo: boolean;
}

export type Limite = number | 'ilimitado';

export interface ReservaQueEntra extends AptoOrdenado {
  /** Reserva "só 1º tempo" que entra: joga apenas o 2º tempo (informação; a regra é a das demais). */
  jogaSo2oTempo: boolean;
}

export interface ClassificacaoDois {
  titulares: AptoOrdenado[];
  reservasQueEntram: ReservaQueEntra[];
  naoEntra: AptoOrdenado[];
}

export interface EntradaClassificacao {
  ordem: readonly AptoOrdenado[];
  n: number;
  k: Limite;
}

/** Vagas de reserva no 2º tempo: 2·min(K, N); sem limite, 2N (I-32). */
export function vagasDeReserva(n: number, k: Limite): number {
  return 2 * (k === 'ilimitado' ? n : Math.min(k, n));
}

/** Titulares são os 2N primeiros; entram os próximos `vagasDeReserva`; o resto não entra (I-13, P-28). */
export function classificarDoisTimes({ ordem, n, k }: EntradaClassificacao): ClassificacaoDois {
  if (ordem.length < 2 * n) throw new RangeError(`aptos insuficientes: ${ordem.length} para 2 times de ${n}`);
  const fimTitulares = 2 * n;
  const fimReservas = fimTitulares + vagasDeReserva(n, k);
  return {
    titulares: ordem.slice(0, fimTitulares),
    reservasQueEntram: ordem.slice(fimTitulares, fimReservas).map((a) => ({ ...a, jogaSo2oTempo: a.so1oTempo })),
    naoEntra: ordem.slice(fimReservas),
  };
}

/**
 * Ids que saem no intervalo num time: todos os titulares "só 1º tempo" (mesmo sem reserva, na ordem de
 * prioridade) e, até `max(só 1º tempo, reservas)` saídas, os de pior prioridade (do pior para o melhor).
 */
export function saidaNoIntervalo(titularesDoTime: readonly AptoOrdenado[], reservasEntrando: number): string[] {
  const so1o = titularesDoTime.filter((t) => t.so1oTempo).map((t) => t.id);
  const total = Math.min(Math.max(so1o.length, reservasEntrando), titularesDoTime.length);
  const demais = titularesDoTime
    .filter((t) => !t.so1oTempo)
    .map((t) => t.id)
    .reverse();
  return [...so1o, ...demais.slice(0, total - so1o.length)];
}
