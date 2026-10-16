import type {
  ConfigPesos,
  EntradaRanking,
  JogadorDoRanking,
  PartidaDoRanking,
  PresencaDoRanking,
  SituacaoPresenca,
} from '../../src/index.js';
import { PESOS_PADRAO } from '../../src/index.js';

export const CONFIGS: ConfigPesos[] = [
  { ...PESOS_PADRAO, vigenteDesde: '2026-02-05', registradoEm: '2026-02-05T10:00' },
  {
    ...PESOS_PADRAO,
    presencaComChuva: 2,
    vigenteDesde: '2026-09-01',
    registradoEm: '2026-08-30T10:00',
  },
];

export function jogador(
  id: string,
  apelido: string,
  anoNascimento = 1990,
  periodos: JogadorDoRanking['periodos'] = [{ inicio: '2026-01-01', fim: null }],
): JogadorDoRanking {
  return { id, apelido, anoNascimento, periodos };
}

export function partida(data: string, choveu = false): PartidaDoRanking {
  return { id: `p-${data}`, data, choveu };
}

export function presenca(jogadorId: string, data: string, situacao: SituacaoPresenca = 'presente'): PresencaDoRanking {
  return { partidaId: `p-${data}`, jogadorId, situacao };
}

/** Histórico de 3 meses (ago a out de 2026), com 6 jogadores e a troca de pesos de 01/09. */
export function historicoDeTresMeses(): Omit<EntradaRanking, 'hoje' | 'mes'> {
  const datas = ['2026-08-06', '2026-08-13', '2026-09-03', '2026-09-10', '2026-10-01', '2026-10-08'];
  const partidas = datas.map((d) => partida(d, d === '2026-09-10' || d === '2026-10-08'));
  const jogadores = [
    jogador('a', 'Ana', 1990),
    jogador('b', 'Bia', 1991),
    jogador('c', 'Cris', 1992),
    jogador('d', 'Duda', 1993, [{ inicio: '2026-10-08', fim: null }]),
    jogador('e', 'Edu', 1994, [
      { inicio: '2026-01-01', fim: '2026-09-05' },
      { inicio: '2026-10-01', fim: null },
    ]),
    jogador('f', 'Fê', 1995, [{ inicio: '2026-01-01', fim: '2026-09-20' }]),
  ];
  const presencas: PresencaDoRanking[] = [
    ...datas.map((d) => presenca('a', d)),
    ...datas.slice(0, 4).map((d) => presenca('b', d)),
    presenca('b', '2026-10-01', 'lesionado'),
    presenca('c', '2026-08-06'),
    presenca('c', '2026-09-10', 'expulso'),
    presenca('c', '2026-10-01'),
    presenca('c', '2026-10-08'),
    presenca('d', '2026-10-08'),
    presenca('e', '2026-08-06'),
    presenca('e', '2026-08-13'),
    presenca('e', '2026-09-03'),
    presenca('e', '2026-10-01'),
    presenca('f', '2026-08-06'),
    presenca('f', '2026-09-03'),
  ];
  return { jogadores, partidas, presencas, configsPesos: CONFIGS };
}
