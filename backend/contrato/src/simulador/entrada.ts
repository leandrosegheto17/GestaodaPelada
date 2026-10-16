import { z } from 'zod';
import { LIMITES } from '../limites.js';
import { data, uuid } from '../primitivos.js';

const n = z.number().int().min(LIMITES.jogadoresPorTime.min).max(LIMITES.jogadoresPorTime.max);

/** Substituições por time: 0 a 20, ou sem limite. */
export const kValor = z.union([
  z.number().int().min(LIMITES.substituicoes.min).max(LIMITES.substituicoes.max),
  z.literal('ilimitado'),
]);

const semRepeticao = <T extends { id: string }>(lista: readonly T[]) =>
  new Set(lista.map((a) => a.id)).size === lista.length;

const MENSAGEM_REPETIDO = 'Há jogador repetido nos aptos.';

export const aptoDois = z.strictObject({ id: uuid, so1oTempo: z.boolean() });
export const aptoVarios = z.strictObject({ id: uuid });

const aptosDois = z.array(aptoDois).min(1).max(LIMITES.aptosMax).refine(semRepeticao, MENSAGEM_REPETIDO);
const aptosVarios = z.array(aptoVarios).min(1).max(LIMITES.aptosMax).refine(semRepeticao, MENSAGEM_REPETIDO);

export const entradaDois = z.strictObject({
  formato: z.literal('dois_times'),
  data,
  n,
  k: kValor,
  aptos: aptosDois,
});

/** Vários times não têm K nem "só 1º tempo" (RF-39). */
export const entradaVarios = z.strictObject({
  formato: z.literal('varios_times'),
  data,
  n,
  aptos: aptosVarios,
});

export const entradaSimulador = z.discriminatedUnion('formato', [entradaDois, entradaVarios]);
export type EntradaSimulador = z.infer<typeof entradaSimulador>;

/** A prévia não precisa da data. */
export const entradaPrevia = z.discriminatedUnion('formato', [
  entradaDois.omit({ data: true }),
  entradaVarios.omit({ data: true }),
]);
export type EntradaPrevia = z.infer<typeof entradaPrevia>;
