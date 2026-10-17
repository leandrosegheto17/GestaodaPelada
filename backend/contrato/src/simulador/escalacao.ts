import { z } from 'zod';
import { LIMITES } from '../limites.js';
import { data, uuid } from '../primitivos.js';
import { entradaDois, entradaVarios, kValor } from './entrada.js';

const jogadorComTempo = z.strictObject({ id: uuid, so1oTempo: z.boolean() });

const timeDois = z.strictObject({
  titulares: z.array(jogadorComTempo).max(LIMITES.aptosMax),
  entramNo2oTempo: z.array(jogadorComTempo).max(LIMITES.aptosMax),
});

/** Composição editável de "2 times (1º e 2º tempo)". */
export const composicaoDois = z.strictObject({
  times: z.tuple([timeDois, timeDois]),
  naoEntra: z.array(uuid).max(LIMITES.aptosMax),
});

/** Composição de "3 ou mais times". */
export const composicaoVarios = z.strictObject({
  times: z.array(z.strictObject({ jogadores: z.array(uuid).max(LIMITES.aptosMax) })).max(LIMITES.aptosMax),
});

/** Formato e composição de uma escalação. */
export type Escalada =
  | { formato: 'dois_times'; composicao: z.infer<typeof composicaoDois> }
  | { formato: 'varios_times'; composicao: z.infer<typeof composicaoVarios> };

/** Ids que aparecem na composição: titulares, reservas e "não entra" (dois times), ou todos os times. */
export function idsDaComposicao(escalada: Escalada): string[] {
  if (escalada.formato === 'varios_times') return escalada.composicao.times.flatMap((t) => t.jogadores);
  const { times, naoEntra } = escalada.composicao;
  return [...times.flatMap((t) => [...t.titulares, ...t.entramNo2oTempo].map((j) => j.id)), ...naoEntra];
}

/** Ids sem repetição e todos dentro dos aptos (base do 422 de avaliar e confirmar). */
function composicaoValida(ids: string[], aptos: readonly { id: string }[]): string | null {
  if (new Set(ids).size !== ids.length) return 'Há jogador repetido na composição.';
  const permitidos = new Set(aptos.map((a) => a.id));
  return ids.every((id) => permitidos.has(id)) ? null : 'Há jogador fora dos aptos na composição.';
}

const avaliarDois = entradaDois.extend({ composicao: composicaoDois }).superRefine((corpo, contexto) => {
  const problema = composicaoValida(idsDaComposicao(corpo), corpo.aptos);
  if (problema) contexto.addIssue({ code: 'custom', path: ['composicao'], message: problema });
});

const avaliarVarios = entradaVarios.extend({ composicao: composicaoVarios }).superRefine((corpo, contexto) => {
  const problema = composicaoValida(idsDaComposicao(corpo), corpo.aptos);
  if (problema) contexto.addIssue({ code: 'custom', path: ['composicao'], message: problema });
});

/** Corpo de avaliar: a entrada do simulador mais a composição editada. */
export const avaliarCorpo = z.discriminatedUnion('formato', [avaliarDois, avaliarVarios]);
export type AvaliarCorpo = z.infer<typeof avaliarCorpo>;

function recusarRepetidos(corpo: Escalada, contexto: z.RefinementCtx): void {
  const ids = idsDaComposicao(corpo);
  if (new Set(ids).size !== ids.length) {
    contexto.addIssue({ code: 'custom', path: ['composicao'], message: 'Há jogador repetido na composição.' });
  }
}

/** Corpo de confirmar a escalação: a composição que vai para a data, sem jogador repetido. */
export const escalacaoCorpo = z.discriminatedUnion('formato', [
  z
    .strictObject({
      formato: z.literal('dois_times'),
      data,
      n: entradaDois.shape.n,
      k: kValor,
      composicao: composicaoDois,
    })
    .superRefine(recusarRepetidos),
  z
    .strictObject({
      formato: z.literal('varios_times'),
      data,
      n: entradaVarios.shape.n,
      composicao: composicaoVarios,
    })
    .superRefine(recusarRepetidos),
]);
export type EscalacaoCorpo = z.infer<typeof escalacaoCorpo>;

export const escalacaoConfirmada = z.strictObject({ data, confirmadaEm: z.iso.datetime() });
export type EscalacaoConfirmada = z.infer<typeof escalacaoConfirmada>;
