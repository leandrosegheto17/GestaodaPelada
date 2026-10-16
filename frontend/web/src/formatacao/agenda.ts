import type { DiaSemana, Frequencia } from '@pelada/contrato';
import { ROTULO_DIA_SEMANA, ROTULO_FREQUENCIA } from '../rotulos';

const DIAS_MASCULINOS: readonly DiaSemana[] = ['domingo', 'sabado'];

/** "Quinta, semanal" (dia por extenso e frequência em minúscula). */
export function diaEFrequencia({ diaSemana, frequencia }: { diaSemana: DiaSemana; frequencia: Frequencia }): string {
  return `${ROTULO_DIA_SEMANA[diaSemana]}, ${ROTULO_FREQUENCIA[frequencia].toLowerCase()}`;
}

/**
 * Agenda do grupo numa linha: "Toda quinta · 20:00" (semanal) ou "Domingo, quinzenal · 09:00".
 * Usada pelo ranking público, pela lista de grupos e pelo início do admin.
 */
export function descreverAgenda({
  diaSemana,
  frequencia,
  horario,
}: {
  diaSemana: DiaSemana;
  frequencia: Frequencia;
  horario: string;
}): string {
  const dia = ROTULO_DIA_SEMANA[diaSemana];
  if (frequencia === 'semanal') {
    const artigo = DIAS_MASCULINOS.includes(diaSemana) ? 'Todo' : 'Toda';
    return `${artigo} ${dia.toLowerCase()} · ${horario}`;
  }
  return `${diaEFrequencia({ diaSemana, frequencia })} · ${horario}`;
}
