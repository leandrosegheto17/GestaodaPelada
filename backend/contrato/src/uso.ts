import { z } from 'zod';
import { data } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

const contagem = z.number().int().min(0);

export const usoPorSemana = z.strictObject({
  semanas: z.array(
    z.strictObject({
      inicio: data,
      fim: data,
      aparelhosRanking: contagem,
      pdfsExportados: contagem,
      partidasLancadas: contagem,
      partidasEm48h: contagem,
      escalacoesConfirmadas: contagem,
    }),
  ),
});
export type UsoPorSemana = z.infer<typeof usoPorSemana>;

export const esquemasUso: Esquemas = {
  'uso.semanal': { direcao: 'resposta', schema: usoPorSemana },
};
