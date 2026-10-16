import { contemBusca } from '../../formatacao/texto';

export type FiltroJogadores = 'ativos' | 'inativos';

/** `?filtro=`: só `ativos` ou `inativos` valem (caixa exata); qualquer outra coisa é `ativos`. */
export function lerFiltro(parametros: URLSearchParams): FiltroJogadores {
  return parametros.get('filtro') === 'inativos' ? 'inativos' : 'ativos';
}

/** Filtra pelo apelido ignorando caixa e acento. Mantém a ordem recebida da API. */
export function filtrarPorBusca<T extends { apelido: string }>(itens: readonly T[], termo: string): T[] {
  return itens.filter((item) => contemBusca(item.apelido, termo));
}
