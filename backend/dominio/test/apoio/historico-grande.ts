import type { EntradaRanking, JogadorDoRanking, PartidaDoRanking, PresencaDoRanking } from '../../src/index.js';
import { somarDias } from '../../src/index.js';
import { CONFIGS } from './historico.js';

/** Gerador congruente linear: o mesmo histórico em toda execução, sem sorteio nem relógio. */
function sequencia(semente: number): () => number {
  let estado = semente;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648;
    return estado / 2147483648;
  };
}

/**
 * 16 jogadores, 24 partidas semanais (ago a jan), pontuação inicial em parte deles, períodos fechados e
 * reabertos. Nenhuma presença é anterior ao início do primeiro período do jogador.
 */
export function historicoGrande(): Omit<EntradaRanking, 'hoje' | 'mes'> {
  const sorteio = sequencia(2026);
  const partidas: PartidaDoRanking[] = Array.from({ length: 24 }, (_, i) => {
    const data = somarDias('2026-08-06', 7 * i);
    return { id: `p-${data}`, data, choveu: sorteio() < 0.3 };
  });
  const jogadores: JogadorDoRanking[] = Array.from({ length: 16 }, (_, i) => {
    const primeiro = partidas[(i * 3) % 10]!.data;
    const periodos =
      i % 4 === 1
        ? [
            { inicio: primeiro, fim: somarDias(primeiro, 50) },
            { inicio: somarDias(primeiro, 80), fim: null },
          ]
        : i % 4 === 2
          ? [{ inicio: primeiro, fim: somarDias(primeiro, 90) }]
          : [{ inicio: primeiro, fim: null }];
    return {
      id: `j${i}`,
      apelido: `Jogador ${i}`,
      anoNascimento: 1980 + (i % 7),
      periodos,
      pontuacaoInicial: i % 3 === 0 ? i * 2 : 0,
    };
  });
  const presencas: PresencaDoRanking[] = [];
  for (const j of jogadores) {
    for (const p of partidas) {
      if (p.data < j.periodos[0]!.inicio) continue;
      const x = sorteio();
      if (x < 0.55) presencas.push({ partidaId: p.id, jogadorId: j.id, situacao: 'presente' });
      else if (x < 0.62) presencas.push({ partidaId: p.id, jogadorId: j.id, situacao: 'lesionado' });
      else if (x < 0.66) presencas.push({ partidaId: p.id, jogadorId: j.id, situacao: 'expulso' });
    }
  }
  return { jogadores, partidas, presencas, configsPesos: CONFIGS };
}
