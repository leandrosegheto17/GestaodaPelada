import { ativoEm } from '@pelada/dominio';

export interface PeriodoDeAtividade {
  inicio: string;
  fim: string | null;
}

export interface SituacaoDoJogador {
  ativo: boolean;
  /** Ativo: início do período em vigor. Inativo: data em que saiu (fim do último período). */
  desde: string;
}

export function situacaoAtual(periodos: readonly PeriodoDeAtividade[], hoje: string): SituacaoDoJogador {
  const ordenados = [...periodos].sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0));
  const ativo = ativoEm(ordenados, hoje);
  if (ativo) {
    const emVigor = [...ordenados].reverse().find((p) => p.inicio <= hoje && (p.fim === null || hoje < p.fim));
    return { ativo, desde: emVigor?.inicio ?? hoje };
  }
  const ultimo = ordenados[ordenados.length - 1];
  return { ativo, desde: ultimo?.fim ?? ultimo?.inicio ?? hoje };
}
