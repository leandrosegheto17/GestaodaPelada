import type { ZodType } from 'zod';
import { erroPadrao } from './erro.js';

export interface EsquemaRegistrado {
  direcao: 'entrada' | 'resposta';
  schema: ZodType;
}

/**
 * Todo schema publicado pelo contrato, por nome. Cada contexto exporta o seu objeto `esquemas`
 * e entra aqui numa linha. O snapshot e a checagem de compatibilidade leem este registro.
 */
export const REGISTRO: Record<string, EsquemaRegistrado> = {
  erro: { direcao: 'resposta', schema: erroPadrao },
};
