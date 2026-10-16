import { z } from 'zod';
import { jogadorItem } from '../elenco.js';
import { data, idResposta } from '../primitivos.js';

export const contextoConsulta = z.strictObject({ data: data.optional() });

/** Quem pode entrar na escalação da data, com o nível já calculado pelo servidor. */
export const contextoSimulador = z.strictObject({
  dataSugerida: data,
  hoje: data,
  jogadores: z.array(
    z.strictObject({
      id: idResposta,
      apelido: z.string(),
      ...jogadorItem.pick({ nivel: true, semNota: true }).shape,
    }),
  ),
});
export type ContextoSimulador = z.infer<typeof contextoSimulador>;
