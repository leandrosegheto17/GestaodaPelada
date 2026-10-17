/**
 * Orçamento de CPU do simulador: 30 aptos em 2 times de 11 e em 6 times de 5.
 * `LIMIAR_MS` é a meta de 4 ms em Node (margem sobre os 7 ms do orçamento do Worker); acima dele o teste
 * falha e imprime os números. Não afrouxar: otimizar primeiro.
 */
import { describe, expect, it } from 'vitest';
import { sugerir, type EntradaSugerir } from '../../src/index.js';
import { elencoSim, historicoSim } from './apoio.js';

const LIMIAR_MS = 4;
const AQUECIMENTOS = 5;
const MEDICOES = 50;
/** O lote inteiro (aquecimento + 50 × 100 chamadas) passa do timeout padrão de 5 s do vitest. */
const TIMEOUT_MS = 60_000;

/** Chamadas por medição: o relógio de CPU do Windows avança em passos de ~15,6 ms, então o tempo de uma
 * chamada só é legível se dividido entre um lote; cada medição é a média por chamada do lote. */
const CHAMADAS_POR_MEDICAO = 100;

function medir(entrada: EntradaSugerir): { mediana: number; p99: number } {
  for (let i = 0; i < AQUECIMENTOS; i += 1) sugerir(entrada);
  const tempos: number[] = [];
  for (let i = 0; i < MEDICOES; i += 1) {
    const antes = process.cpuUsage();
    for (let c = 0; c < CHAMADAS_POR_MEDICAO; c += 1) sugerir(entrada);
    const depois = process.cpuUsage(antes);
    tempos.push((depois.user + depois.system) / 1000 / CHAMADAS_POR_MEDICAO);
  }
  tempos.sort((a, b) => a - b);
  return { mediana: tempos[Math.floor(MEDICOES / 2)]!, p99: tempos[Math.ceil(MEDICOES * 0.99) - 1]! };
}

describe('orçamento de CPU de sugerir', () => {
  const aptos = elencoSim(30, [3, 9, 15, 21]);
  const historico = historicoSim(aptos);
  const base = { dataPartida: '2026-10-22', aptos, historico } as const;

  it.each([
    ['2 times de 11 (K ilimitado)', { ...base, formato: 'dois_times', n: 11, k: 'ilimitado' }],
    ['6 times de 5', { ...base, formato: 'varios_times', n: 5, k: 0 }],
  ] as const)('%s: mediana e p99 abaixo do limiar', (nome, entrada) => {
    const { mediana, p99 } = medir(entrada);
    const relato = `${nome}: mediana ${mediana.toFixed(2)} ms, p99 ${p99.toFixed(2)} ms (limiar ${LIMIAR_MS} ms)`;
    expect(mediana, relato).toBeLessThan(LIMIAR_MS);
    expect(p99, relato).toBeLessThan(LIMIAR_MS);
  }, TIMEOUT_MS);
});
