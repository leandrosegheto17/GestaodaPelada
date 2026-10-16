import type { Generated } from 'kysely';

export interface EscalacoesTabela {
  id: Generated<string>;
  grupo_id: string;
  data: string;
  formato: 'dois_times' | 'varios_times';
  n: number;
  /** Só em "dois_times"; `null` = ilimitado. */
  k: number | null;
  composicao: unknown;
  confirmada_por: string;
  confirmada_em: Date;
}

export interface TabelasEscalacoes {
  escalacoes: EscalacoesTabela;
}
