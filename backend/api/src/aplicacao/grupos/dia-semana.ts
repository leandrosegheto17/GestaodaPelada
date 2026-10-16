import type { DiaSemana } from '@pelada/contrato';
import type { DiaDaSemana } from '@pelada/dominio';

const INDICES: Record<DiaSemana, DiaDaSemana> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

/** Dia da semana do contrato (`quinta`) no índice do domínio (0 = domingo … 6 = sábado). */
export function indiceDiaSemana(dia: DiaSemana): DiaDaSemana {
  return INDICES[dia];
}
