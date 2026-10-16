import type { EntradaSimulador } from '@pelada/contrato';
import { diaSemanaCurto } from '../../formatacao';
import estilos from './resultado.module.css';

function textoDoLimite(k: number | 'ilimitado'): string {
  if (k === 'ilimitado') return 'substituições ilimitadas';
  if (k === 0) return 'sem substituições';
  return `até ${k} ${k === 1 ? 'substituição' : 'substituições'} por time`;
}

/** "qui, 22/10 · 2 times de 7 · até 2 substituições por time": só formatação do que foi pedido. */
export function LinhaContexto({ entrada }: { entrada: EntradaSimulador }) {
  const partes =
    entrada.formato === 'dois_times'
      ? [`2 times de ${entrada.n}`, textoDoLimite(entrada.k)]
      : [`times de ${entrada.n}`];
  return <p className={estilos.contexto}>{[diaSemanaCurto(entrada.data), ...partes].join(' · ')}</p>;
}
