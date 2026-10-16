import { entradaSimulador, LIMITES, type EntradaPrevia, type EntradaSimulador } from '@pelada/contrato';

export type FormatoEntrada = 'dois_times' | 'varios_times';

/** Estado do formulário do simulador. Só o que a pessoa escolheu; a lista de jogadores vem da API. */
export interface EstadoEntradas {
  /** `null` = o próximo dia de jogo sugerido pela API. */
  data: string | null;
  formato: FormatoEntrada;
  n: number;
  k: number;
  ilimitado: boolean;
  /** `null` = todos os jogadores da lista estão marcados (ainda ninguém mexeu na seleção). */
  marcados: ReadonlySet<string> | null;
  /** "Só 1º tempo": só vale para quem está marcado, e só em 2 times. */
  so1oTempo: ReadonlySet<string>;
}

export type Acao =
  | { tipo: 'data'; data: string | null }
  | { tipo: 'formato'; formato: FormatoEntrada }
  | { tipo: 'n'; n: number }
  | { tipo: 'k'; k: number }
  | { tipo: 'ilimitado'; ilimitado: boolean }
  | { tipo: 'marcar'; id: string; marcado: boolean; todos: readonly string[] }
  | { tipo: 'marcarTodos'; todos: readonly string[] }
  | { tipo: 'desmarcarTodos' }
  | { tipo: 'so1oTempo'; id: string; valor: boolean };

/** Valores de partida: 7 por time, 2 substituições, 2 times, todos marcados e ninguém "só 1º tempo". */
export const ESTADO_INICIAL: EstadoEntradas = {
  data: null,
  formato: 'dois_times',
  n: 7,
  k: 2,
  ilimitado: false,
  marcados: null,
  so1oTempo: new Set(),
};

const entre = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

export function reduzir(estado: EstadoEntradas, acao: Acao): EstadoEntradas {
  switch (acao.tipo) {
    case 'data':
      return { ...estado, data: acao.data };
    case 'formato':
      return { ...estado, formato: acao.formato };
    case 'n':
      return { ...estado, n: entre(acao.n, LIMITES.jogadoresPorTime.min, LIMITES.jogadoresPorTime.max) };
    case 'k':
      return { ...estado, k: entre(acao.k, LIMITES.substituicoes.min, LIMITES.substituicoes.max) };
    case 'ilimitado':
      return { ...estado, ilimitado: acao.ilimitado };
    case 'marcar': {
      const marcados = new Set(estado.marcados ?? acao.todos);
      const so1oTempo = new Set(estado.so1oTempo);
      if (acao.marcado) marcados.add(acao.id);
      else {
        marcados.delete(acao.id);
        so1oTempo.delete(acao.id);
      }
      return { ...estado, marcados, so1oTempo };
    }
    case 'marcarTodos':
      return { ...estado, marcados: new Set(acao.todos) };
    case 'desmarcarTodos':
      return { ...estado, marcados: new Set(), so1oTempo: new Set() };
    case 'so1oTempo': {
      const so1oTempo = new Set(estado.so1oTempo);
      if (acao.valor) so1oTempo.add(acao.id);
      else so1oTempo.delete(acao.id);
      return { ...estado, so1oTempo };
    }
  }
}

/** Ids marcados entre os da lista atual (quem saiu da lista numa troca de data deixa de contar). */
export function idsMarcados(estado: EstadoEntradas, todos: readonly string[]): string[] {
  return estado.marcados === null ? [...todos] : todos.filter((id) => estado.marcados?.has(id));
}

/**
 * Entrada da API a partir do estado: em 3 ou mais times não há K nem "só 1º tempo". `null` quando não há
 * nenhum apto marcado (o contrato exige pelo menos um).
 */
export function paraEntrada(estado: EstadoEntradas, todos: readonly string[], data: string): EntradaSimulador | null {
  const marcados = idsMarcados(estado, todos);
  if (marcados.length === 0) return null;
  const entrada =
    estado.formato === 'dois_times'
      ? {
          formato: 'dois_times',
          data,
          n: estado.n,
          k: estado.ilimitado ? 'ilimitado' : estado.k,
          aptos: marcados.map((id) => ({ id, so1oTempo: estado.so1oTempo.has(id) })),
        }
      : { formato: 'varios_times', data, n: estado.n, aptos: marcados.map((id) => ({ id })) };
  const analise = entradaSimulador.safeParse(entrada);
  return analise.success ? analise.data : null;
}

/** A prévia não leva a data. */
export function paraPrevia(entrada: EntradaSimulador): EntradaPrevia {
  if (entrada.formato === 'dois_times') {
    return { formato: entrada.formato, n: entrada.n, k: entrada.k, aptos: entrada.aptos };
  }
  return { formato: entrada.formato, n: entrada.n, aptos: entrada.aptos };
}

/** Reabre o formulário com uma entrada já usada (ex.: "Editar entradas" na tela de resultado). */
export function estadoDeEntrada(entrada: EntradaSimulador): EstadoEntradas {
  const dois = entrada.formato === 'dois_times';
  return {
    data: entrada.data,
    formato: entrada.formato,
    n: entrada.n,
    k: dois && entrada.k !== 'ilimitado' ? entrada.k : ESTADO_INICIAL.k,
    ilimitado: dois && entrada.k === 'ilimitado',
    marcados: new Set(entrada.aptos.map((a) => a.id)),
    so1oTempo: new Set(dois ? entrada.aptos.filter((a) => 'so1oTempo' in a && a.so1oTempo).map((a) => a.id) : []),
  };
}
