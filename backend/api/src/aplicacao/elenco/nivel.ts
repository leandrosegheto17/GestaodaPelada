import { calcularNivel } from '@pelada/dominio';

export interface NivelDaResposta {
  /** Nível de 1 a 10 com uma casa decimal (6.8), como o contrato entrega. */
  nivel: number;
  semNota: boolean;
}

/**
 * Converte o nível do domínio (média × 100, ex.: 683) para a unidade da resposta, com meio
 * arredondado para cima na primeira casa, só em inteiros. O × 100 fica interno.
 */
export function nivelDaResposta(notas: readonly number[]): NivelDaResposta {
  const { nivel, semNota } = calcularNivel(notas);
  return { nivel: Math.floor((nivel + 5) / 10) / 10, semNota };
}
