import { z } from 'zod';

const descricao = z.string().min(1);
const contagem = z.number().int().min(0);
const motivo = z.literal('aptos_insuficientes');

const previaDois = z.strictObject({
  formato: z.literal('dois_times'),
  /** `false` quando não há aptos para dois times de N: `motivo` e `maiorNPossivel` explicam. */
  valida: z.boolean(),
  descricao,
  times: z.literal(2).optional(),
  reservas: contagem.optional(),
  motivo: motivo.optional(),
  maiorNPossivel: contagem.nullable(),
});

const previaVarios = z.strictObject({
  formato: z.literal('varios_times'),
  valida: z.boolean(),
  descricao,
  times: contagem.optional(),
  timesCompletos: contagem.optional(),
  tamanhoIncompleto: contagem.optional(),
  motivo: motivo.optional(),
  /** Maior N que ainda forma pelo menos 3 times, quando a prévia é inválida. */
  nSugerido: contagem.nullable().optional(),
});

/** Prévia ao vivo do simulador: quantos times saem, com o texto já pronto em `descricao`. */
export const previaSimulador = z.discriminatedUnion('formato', [previaDois, previaVarios]);
export type PreviaSimulador = z.infer<typeof previaSimulador>;
