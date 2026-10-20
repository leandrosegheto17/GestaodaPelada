import { PESOS_PADRAO, type EntradaSugerir, type JogadorSim } from '../../src/index.js';

/** Elenco determinístico por fórmula sobre o índice: sem aleatório. */
export function elencoSim(
  quantos: number,
  so1o: readonly number[] = [],
  semNota: readonly number[] = [],
): JogadorSim[] {
  return Array.from({ length: quantos }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    nivel: 300 + ((i * 137) % 600),
    idade: 20 + ((i * 7) % 25),
    so1oTempo: so1o.includes(i + 1),
    semNota: semNota.includes(i + 1),
  }));
}

/** Histórico pequeno: duas partidas anteriores à data, com presença de metade do elenco. */
export function historicoSim(aptos: readonly JogadorSim[]): EntradaSugerir['historico'] {
  return {
    jogadores: aptos.map((a, i) => ({
      id: a.id,
      apelido: `Jogador ${a.id}`,
      anoNascimento: 1980 + (i % 15),
      periodos: [{ inicio: '2026-01-01', fim: null }],
      pontuacaoInicial: 0,
    })),
    partidas: [
      { id: 'p1', data: '2026-10-01', choveu: false },
      { id: 'p2', data: '2026-10-08', choveu: true },
    ],
    presencas: aptos.flatMap((a, i) =>
      i % 2 === 0
        ? [
            { partidaId: 'p1', jogadorId: a.id, situacao: 'presente' as const },
            { partidaId: 'p2', jogadorId: a.id, situacao: 'presente' as const },
          ]
        : [],
    ),
    configsPesos: [{ ...PESOS_PADRAO, vigenteDesde: '2026-02-05', registradoEm: '2026-02-05T10:00' }],
  };
}
