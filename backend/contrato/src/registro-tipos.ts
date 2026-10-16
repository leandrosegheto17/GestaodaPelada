import type { ZodType } from 'zod';

export interface EsquemaRegistrado {
  direcao: 'entrada' | 'resposta';
  schema: ZodType;
}

export type Esquemas = Record<string, EsquemaRegistrado>;
