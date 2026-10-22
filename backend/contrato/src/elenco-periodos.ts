import { z } from 'zod';
import { SITUACOES_PRESENCA } from './enums.js';
import { data, idResposta } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

const inteiroNaoNegativo = z.number().int().min(0);

/** Cada período do jogador, com o que a tela pode corrigir nele (saída e/ou retorno). */
export const periodoItem = z.strictObject({
  id: idResposta,
  tipo: z.enum(['entrada', 'retorno']),
  inicio: data,
  fim: data.nullable(),
  corrigivel: z.strictObject({ saida: z.boolean(), retorno: z.boolean() }),
});

export const periodosResposta = z.strictObject({ periodos: z.array(periodoItem) });
export type PeriodosResposta = z.infer<typeof periodosResposta>;

/** Corrige a saída e/ou o retorno de um período; ao menos um dos dois. */
export const periodoCorrigirCorpo = z
  .strictObject({ saida: data.optional(), retorno: data.optional() })
  .refine((corpo) => corpo.saida !== undefined || corpo.retorno !== undefined, 'Informe a saída ou o retorno.');
export type PeriodoCorrigirCorpo = z.infer<typeof periodoCorrigirCorpo>;

/** `alterado: false` quando as datas enviadas já eram as atuais. */
export const periodoCorrigirResposta = z.strictObject({
  alterado: z.boolean(),
  periodos: z.array(periodoItem),
});
export type PeriodoCorrigirResposta = z.infer<typeof periodoCorrigirResposta>;

export const reativarPreviaCorpo = z.strictObject({ dataRetorno: data });
export type ReativarPreviaCorpo = z.infer<typeof reativarPreviaCorpo>;

/** Efeito de corrigir um período ou reativar com retorno retroativo, sem gravar. */
export const periodoPreviaResposta = z.strictObject({
  acumuladoAntes: z.number().int(),
  acumuladoDepois: z.number().int(),
  posicaoAntes: inteiroNaoNegativo.nullable(),
  posicaoDepois: inteiroNaoNegativo.nullable(),
  rodadasQuePassamAConstar: z.array(z.strictObject({ data, situacao: z.enum([...SITUACOES_PRESENCA, 'falta']) })),
  rodadasQueDeixamDeConstar: z.array(z.strictObject({ data })),
  aviso: z.string().nullable(),
});
export type PeriodoPreviaResposta = z.infer<typeof periodoPreviaResposta>;

export const esquemasElencoPeriodos: Esquemas = {
  'elenco.periodos.resposta': { direcao: 'resposta', schema: periodosResposta },
  'elenco.periodo.corrigir.corpo': { direcao: 'entrada', schema: periodoCorrigirCorpo },
  'elenco.periodo.corrigir.resposta': { direcao: 'resposta', schema: periodoCorrigirResposta },
  'elenco.reativar.previa.corpo': { direcao: 'entrada', schema: reativarPreviaCorpo },
  'elenco.periodo.previa.resposta': { direcao: 'resposta', schema: periodoPreviaResposta },
};
