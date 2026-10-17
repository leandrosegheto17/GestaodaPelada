import { compararApelido, compararApelidoBase } from '../elenco/apelido.js';

export interface Rankeavel {
  id: string;
  apelido: string;
  anoNascimento: number;
}

export interface Colocado<T extends Rankeavel> {
  jogador: T;
  acumulado: number;
  /** Colocação: empatados nos três critérios repetem o número e o seguinte pula (1, 1, 3). */
  posicao: number;
}

/**
 * Ordem do ranking (RN-05): acumulado até a referência (maior primeiro), ano de nascimento
 * (menor primeiro) e apelido sem acento nem caixa. O `id` só estabiliza a ordem de empatados.
 */
export function ordenarPorRanking<T extends Rankeavel>(
  jogadores: readonly T[],
  acumulados: ReadonlyMap<string, number>,
): Colocado<T>[] {
  const itens = jogadores.map((jogador) => ({
    jogador,
    acumulado: acumulados.get(jogador.id) ?? 0,
  }));
  const comparar = (a: (typeof itens)[number], b: (typeof itens)[number]): number =>
    b.acumulado - a.acumulado ||
    a.jogador.anoNascimento - b.jogador.anoNascimento ||
    compararApelidoBase(a.jogador.apelido, b.jogador.apelido);

  itens.sort((a, b) => comparar(a, b) || compararApelido(a.jogador, b.jogador));

  const colocados: Colocado<T>[] = [];
  itens.forEach((item, indice) => {
    const anterior = itens[indice - 1];
    const empata = anterior !== undefined && comparar(anterior, item) === 0;
    colocados.push({ ...item, posicao: empata ? colocados[indice - 1]!.posicao : indice + 1 });
  });
  return colocados;
}
