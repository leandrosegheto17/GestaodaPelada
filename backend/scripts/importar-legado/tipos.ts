import type { Posicao } from '@pelada/contrato';

/** Falha de leitura ou de conferência. A mensagem cita só o número da linha, nunca o conteúdo dela. */
export class ErroLegado extends Error {
  constructor(
    mensagem: string,
    readonly linha?: number,
  ) {
    super(linha === undefined ? mensagem : `Linha ${linha}: ${mensagem}`);
  }
}

/** Uma linha da tabela "Classificação atual" de `Pontuacoes.md`. */
export interface LinhaClassificacao {
  linha: number;
  apelido: string;
  situacao: 'ativo' | 'inativo';
  inicial: number;
  ajustes: number;
  atual: number;
}

/** Um valor de rodada: pontos do legado, ou `null` quando o atleta não aparece naquela rodada. */
export type ValorDeRodada = 0 | 2 | 3 | 5 | 6 | null;

export interface RodadaLida {
  data: string;
  /** Atleta (em minúsculas, sem acento) → valor. Ausente do mapa = não aparece na tabela do mês. */
  valores: Map<string, { apelido: string; valor: ValorDeRodada; linha: number }>;
}

export interface PontuacoesLidas {
  classificacao: LinhaClassificacao[];
  rodadas: RodadaLida[];
}

export interface AtivoLido {
  apelido: string;
  anoNascimento: number;
  posicao: Posicao;
  /** Seis notas de 1 a 10, na ordem do catálogo inicial. */
  notas: number[];
}

/** O cadastro nunca carrega telefone nem data de nascimento completa: só o que a importação grava. */
export interface CadastroLido {
  ativos: AtivoLido[];
  inativos: string[];
}

export const chaveDe = (apelido: string): string =>
  apelido.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
