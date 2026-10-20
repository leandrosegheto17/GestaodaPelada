import type {
  ConfigPesos,
  EntradaRanking,
  JogadorDoRanking,
  PartidaDoRanking,
  PresencaDoRanking,
  SituacaoPresenca,
} from '../../src/index.js';
import { PESOS_PADRAO, somarDias } from '../../src/index.js';

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
  pontuacaoInicial = 0,
): JogadorDoRanking {
  return { id, apelido, anoNascimento, periodos, pontuacaoInicial };
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

type LinhaMockup = readonly [string, number, number, string, number, number, string];

/** Linhas do PDF dos mockups `publico-pdf-2026-07.json` e `-2026-10.json`: apelido, ptsInicial/ptsFinal/rodadas de julho e de outubro. Rodada: letra da situação (p, f, l, e, - = fora) + pontos. */
const LINHAS_MOCKUP: readonly LinhaMockup[] = [
  ['Toninho', 7, 18, 'p1 p1 f0 p1 p1 p1 p1 p1 p1 p1 p1 p1', 17, 31, 'p1 p1 p1 p1 p1 p1 p1 p2 p1 p1 p2 p1'],
  ['Bigode', 8, 18, 'p1 f0 p1 p1 p1 p1 f0 p1 p1 p1 p1 p1', 17, 30, 'p1 p1 f0 p1 p1 p1 p1 p2 p1 p1 p2 p1'],
  ['Careca', 8, 19, 'p1 p1 p1 p1 f0 p1 p1 p1 p1 p1 p1 p1', 18, 30, 'p1 f0 p1 p1 p1 p1 l1 p2 p1 p1 l1 p1'],
  ['Juninho', 9, 21, 'p1 p1 p1 p1 p1 p1 p1 p1 p1 p1 p1 p1', 20, 29, 'p1 p1 p1 f0 p1 p1 p1 f0 p1 p1 f0 p1'],
  ['Marcão', 8, 18, 'p1 p1 p1 f0 p1 p1 p1 p1 f0 p1 p1 p1', 17, 28, 'p1 p1 p1 p1 f0 p1 p1 p2 p1 p1 p2 e-1'],
  ['Paulinho', 7, 16, 'f0 p1 p1 p1 p1 f0 p1 p1 p1 p1 p1 f0', 16, 27, 'f0 p1 p1 p1 p1 f0 p1 p2 p1 f0 p2 p1'],
  ['Zé Carlos', 6, 16, 'p1 p1 f0 p1 p1 p1 p1 f0 p1 p1 p1 p1', 15, 27, 'p1 p1 p1 p1 p1 p1 f0 p2 p1 p1 p2 f0'],
  ['Dudu', 7, 16, 'p1 f0 p1 p1 f0 p1 p1 p1 p1 f0 p1 p1', 15, 26, 'p1 f0 p1 p1 p1 p1 p1 f0 p1 p1 p2 p1'],
  ['Gordo', 5, 13, 'f0 p1 p1 f0 p1 p1 f0 p1 p1 f0 p1 p1', 12, 24, 'p1 p1 f0 p1 p1 f0 p1 p2 p1 p1 p2 p1'],
  ['Tiago', 5, 13, 'p1 f0 p1 p1 p1 f0 p1 p1 f0 p1 p1 f0', 13, 24, 'f0 p1 p1 p1 f0 p1 p1 p2 f0 p1 p2 p1'],
  ['Neném', 4, 13, 'p1 p1 f0 p1 p1 p1 f0 p1 p1 p1 f0 p1', 12, 23, 'p1 p1 p1 p1 p1 p1 p1 p2 p1 p1 f0 f0'],
  ['Rafinha', 4, 12, 'f0 p1 p1 p1 f0 p1 p1 f0 p1 f0 p1 p1', 11, 22, 'p1 f0 p1 f0 p1 p1 p1 p2 p1 f0 p2 p1'],
  ['Alemão', 4, 12, 'p1 f0 p1 f0 p1 f0 p1 p1 f0 p1 p1 p1', 11, 21, 'p1 p1 f0 p1 p1 p1 f0 p2 p1 p1 f0 p1'],
  ['Pedrão', 3, 9, 'f0 p1 f0 p1 f0 p1 f0 p1 f0 p1 p1 f0', 9, 19, 'f0 p1 p1 p1 p1 p1 e-1 p2 p1 p1 p2 f0'],
  ['Cabeça', 4, 11, 'p1 f0 p1 f0 p1 f0 p1 f0 p1 f0 p1 p1', 10, 18, 'p1 f0 f0 p1 p1 f0 p1 p2 p1 f0 f0 p1'],
  ['Vini', 3, 9, 'f0 p1 f0 p1 f0 p1 p1 f0 p1 f0 p1 f0', 9, 17, 'f0 f0 p1 p1 f0 p1 p1 f0 p1 f0 p2 p1'],
  ['Japa', 3, 9, 'p1 f0 p1 f0 p1 f0 p1 f0 p1 f0 f0 p1', 8, 15, 'p1 p1 f0 f0 p1 p1 f0 p2 f0 p1 f0 f0'],
  ['Fumaça', 2, 7, 'f0 p1 f0 f0 p1 f0 p1 f0 p1 f0 p1 f0', 7, 12, 'f0 p1 f0 p1 f0 f0 p1 f0 p1 f0 f0 p1'],
  ['Léo Baiano', 0, 0, '- - - - - - - - - - - -', 0, 3, '- - - - - - - - - - p2 p1'],
  ['Serginho', 0, 0, '- - - - - - - - - - - -', 0, 1, '- - - - - - - - - - - p1'],
];

const COLUNAS_JULHO = [
  '2026-04-09',
  '2026-04-16',
  '2026-04-23',
  '2026-04-30',
  '2026-05-07',
  '2026-05-14',
  '2026-05-21',
  '2026-05-28',
  '2026-06-04',
  '2026-06-11',
  '2026-06-18',
  '2026-06-25',
];
const COLUNAS_OUTUBRO = [
  '2026-06-25',
  '2026-08-06',
  '2026-08-13',
  '2026-08-20',
  '2026-08-27',
  '2026-09-03',
  '2026-09-10',
  '2026-09-17',
  '2026-09-24',
  '2026-10-01',
  '2026-10-08',
  '2026-10-15',
];
const CHUVA_MOCKUP = ['2026-04-16', '2026-05-21', '2026-08-13', '2026-09-17', '2026-10-08'];
const SITUACAO_DA_LETRA: Record<string, SituacaoPresenca | 'fora' | 'falta'> = {
  p: 'presente',
  f: 'falta',
  l: 'lesionado',
  e: 'expulso',
  '-': 'fora',
};

const lerRodadas = (texto: string) =>
  texto.split(' ').map((r) => ({
    situacao: SITUACAO_DA_LETRA[r[0]!]!,
    pontos: r.length === 1 ? null : Number(r.slice(1)),
  }));

/** Resultado esperado do PDF do mockup para `2026-07` ou `2026-10`, na ordem do ranking. */
export function esperadoDoMockup(mes: '2026-07' | '2026-10') {
  const julho = mes === '2026-07';
  return LINHAS_MOCKUP.map((l, i) => ({
    posicao: i + 1,
    apelido: l[0],
    ptsInicial: julho ? l[1] : l[4],
    ptsFinal: julho ? l[2] : l[5],
    rodadas: lerRodadas(julho ? l[3] : l[6]),
  }));
}

/**
 * Histórico que reproduz os dois PDFs do mockup (20 jogadores, 12 colunas em julho e em outubro, troca de
 * pesos em 01/09). O acumulado anterior às colunas de julho vem de partidas semanais de fevereiro a abril.
 */
export function historicoDoMockup(): Omit<EntradaRanking, 'hoje' | 'mes'> {
  const anteriores = Array.from({ length: 9 }, (_, i) => somarDias('2026-04-09', -7 * (i + 1)));
  const colunas = [...COLUNAS_JULHO, ...COLUNAS_OUTUBRO.slice(1)];
  const partidas = [...anteriores, ...colunas].map((d) => partida(d, CHUVA_MOCKUP.includes(d)));
  const jogadores: JogadorDoRanking[] = [];
  const presencas: PresencaDoRanking[] = [];
  LINHAS_MOCKUP.forEach((l, i) => {
    const id = `m${i + 1}`;
    const rodadas = [...lerRodadas(l[3]), ...lerRodadas(l[6]).slice(1)];
    const inicio = rodadas.findIndex((r) => r.situacao !== 'fora');
    jogadores.push(jogador(id, l[0], 1990, [{ inicio: inicio < 0 ? '2026-12-31' : colunas[inicio]!, fim: null }]));
    anteriores.slice(0, l[1]).forEach((d) => presencas.push(presenca(id, d)));
    rodadas.forEach((r, k) => {
      if (r.situacao !== 'fora' && r.situacao !== 'falta') presencas.push(presenca(id, colunas[k]!, r.situacao));
    });
  });
  return { jogadores, partidas, presencas, configsPesos: CONFIGS };
}
