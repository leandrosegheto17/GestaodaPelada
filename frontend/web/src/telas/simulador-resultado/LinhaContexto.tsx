import type { EntradaSimulador } from '@pelada/contrato';
import { diaSemanaCurto } from '../../formatacao';
import estilos from './resultado.module.css';

function textoDoLimite(k: number | 'ilimitado'): string {
  if (k === 'ilimitado') return 'substituições ilimitadas';
  if (k === 0) return 'sem substituições';
  return `até ${k} ${k === 1 ? 'substituição' : 'substituições'} por time`;
}

/** Resumo dos times como vieram: quantos completos e, se houver, o tamanho do incompleto (só contagem). */
function resumoDosTimes(n: number, times: readonly { incompleto: boolean; tamanho: number }[]): string {
  const completos = times.filter((t) => !t.incompleto).length;
  const incompleto = times.find((t) => t.incompleto);
  const base = `${completos} ${completos === 1 ? 'time' : 'times'} de ${n}`;
  return incompleto ? `${base} + 1 time incompleto de ${incompleto.tamanho}` : base;
}

interface Props {
  entrada: EntradaSimulador;
  /** Só em 3 ou mais times: os times que a tela está mostrando. */
  times?: readonly { incompleto: boolean; tamanho: number }[];
}

/** "qui, 22/10 · 2 times de 7 · até 2 substituições por time": só formatação do que foi pedido e do que veio. */
export function LinhaContexto({ entrada, times = [] }: Props) {
  const partes =
    entrada.formato === 'dois_times'
      ? [`2 times de ${entrada.n}`, textoDoLimite(entrada.k)]
      : [resumoDosTimes(entrada.n, times)];
  return <p className={estilos.contexto}>{[diaSemanaCurto(entrada.data), ...partes].join(' · ')}</p>;
}
