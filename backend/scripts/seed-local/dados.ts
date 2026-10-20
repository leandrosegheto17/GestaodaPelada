import type { Posicao } from '@pelada/contrato';

/** Dados fictícios do seed local (apelidos e posições de .md/mockup/respostas/jogadores.json). */
export interface JogadorDoSeed {
  apelido: string;
  posicao: Posicao;
  anoNascimento: number;
  /** Nível aproximado do mockup (1 a 10); `null` = sem nota. */
  nivel: number | null;
  /** Pontos de antes da primeira partida; omitido = 0. */
  pontuacaoInicial?: number;
}

export const JOGADORES_QUINTA: readonly JogadorDoSeed[] = [
  { apelido: 'Alemão', posicao: 'zagueiro', anoNascimento: 1985, nivel: 6.1 },
  { apelido: 'Bigode', posicao: 'zagueiro', anoNascimento: 1979, nivel: 6.9 },
  { apelido: 'Cabeça', posicao: 'atacante', anoNascimento: 1990, nivel: 5.8 },
  { apelido: 'Careca', posicao: 'meia', anoNascimento: 1982, nivel: 6.4 },
  { apelido: 'Dudu', posicao: 'atacante', anoNascimento: 1995, nivel: 6.0 },
  { apelido: 'Fumaça', posicao: 'zagueiro', anoNascimento: 1988, nivel: 5.2 },
  { apelido: 'Gordo', posicao: 'goleiro', anoNascimento: 1976, nivel: 5.6 },
  { apelido: 'Japa', posicao: 'meia', anoNascimento: 1992, nivel: 6.3 },
  { apelido: 'Juninho', posicao: 'meia', anoNascimento: 1996, nivel: 7.2 },
  { apelido: 'Léo Baiano', posicao: 'meia', anoNascimento: 1991, nivel: null },
  { apelido: 'Marcão', posicao: 'zagueiro', anoNascimento: 1983, nivel: 6.6 },
  { apelido: 'Neném', posicao: 'atacante', anoNascimento: 1998, nivel: 5.9 },
  { apelido: 'Paulinho', posicao: 'goleiro', anoNascimento: 1987, nivel: 6.5 },
  { apelido: 'Pedrão', posicao: 'zagueiro', anoNascimento: 1980, nivel: 5.7 },
  { apelido: 'Rafinha', posicao: 'meia', anoNascimento: 1994, nivel: 7.0 },
  { apelido: 'Serginho', posicao: 'atacante', anoNascimento: 1993, nivel: null },
  { apelido: 'Tiago', posicao: 'meia', anoNascimento: 1989, nivel: 6.2 },
  { apelido: 'Toninho', posicao: 'atacante', anoNascimento: 1978, nivel: 6.8 },
  { apelido: 'Vini', posicao: 'atacante', anoNascimento: 1997, nivel: 6.7 },
  { apelido: 'Zé Carlos', posicao: 'zagueiro', anoNascimento: 1984, nivel: 6.0 },
];

export const JOGADORES_DOMINGO: readonly JogadorDoSeed[] = [
  { apelido: 'Carlão', posicao: 'goleiro', anoNascimento: 1981, nivel: 6.0 },
  { apelido: 'Beto', posicao: 'zagueiro', anoNascimento: 1986, nivel: 5.5 },
  { apelido: 'Renato', posicao: 'meia', anoNascimento: 1990, nivel: 6.5 },
  { apelido: 'Gil', posicao: 'atacante', anoNascimento: 1993, nivel: 6.1 },
  { apelido: 'Mica', posicao: 'atacante', anoNascimento: 1995, nivel: null, pontuacaoInicial: 12 },
];

/** Notas do Toninho em `jogador-toninho.json`, na ordem das habilidades iniciais. */
export const NOTAS_DO_TONINHO = [8, 7, 6, 7, 8, 5];

/** Seis notas (1 a 10) em torno do nível, de forma determinística. */
export function notasEmTornoDe(nivel: number, indice: number): number[] {
  const base = Math.round(nivel);
  const variacao = [1, 0, -1, 0, 1, -1];
  return variacao.map((v, i) => Math.min(10, Math.max(1, base + ((i + indice) % 3 === 0 ? -v : v))));
}
