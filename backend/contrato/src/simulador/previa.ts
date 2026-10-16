import { z } from 'zod';

const descricao = z.string().min(1);
const contagem = z.number().int().min(0);

const previaDois = z.strictObject({
  formato: z.literal('dois_times'),
  valida: z.literal(true),
  descricao,
  times: z.literal(2),
  reservas: contagem,
  maiorNPossivel: z.null(),
});

const previaDoisInsuficiente = z.strictObject({
  formato: z.literal('dois_times'),
  valida: z.literal(false),
  motivo: z.literal('aptos_insuficientes'),
  descricao,
  maiorNPossivel: contagem,
});

const previaVarios = z.strictObject({
  formato: z.literal('varios_times'),
  valida: z.literal(true),
  descricao,
  times: contagem,
  timesCompletos: contagem,
  tamanhoIncompleto: contagem,
});

const previaVariosInsuficiente = z.strictObject({
  formato: z.literal('varios_times'),
  valida: z.literal(false),
  motivo: z.literal('aptos_insuficientes'),
  descricao,
  /** Maior N que ainda forma pelo menos 3 times; `null` se nenhum serve. */
  nSugerido: contagem.nullable(),
});

/** Prévia ao vivo do simulador: quantos times saem, com o texto já pronto em `descricao`. */
export const previaSimulador = z.union([previaDois, previaDoisInsuficiente, previaVarios, previaVariosInsuficiente]);
export type PreviaSimulador = z.infer<typeof previaSimulador>;
