import type { PartidaNova, SituacaoPresenca } from '@pelada/contrato';
import { normalizarBusca } from '../../formatacao/texto';

type Jogador = PartidaNova['jogadores'][number];

/** Marcação de cada jogador (por id). Estado local do formulário, antes de salvar. */
export type Marcacoes = Record<string, SituacaoPresenca>;

export function iniciarMarcacoes(jogadores: readonly Jogador[]): Marcacoes {
  return Object.fromEntries(jogadores.map((j) => [j.id, j.situacao]));
}

/** Vale para a lista inteira, não só para a filtrada pela busca. */
export function marcarTodos(marcacoes: Marcacoes, situacao: SituacaoPresenca): Marcacoes {
  return Object.fromEntries(Object.keys(marcacoes).map((id) => [id, situacao]));
}

/** A busca só filtra o que aparece; as marcações de quem some continuam valendo. */
export function filtrarJogadores(jogadores: readonly Jogador[], busca: string): Jogador[] {
  const termo = normalizarBusca(busca);
  return termo === '' ? [...jogadores] : jogadores.filter((j) => normalizarBusca(j.apelido).includes(termo));
}

/** Corpo do envio: todas as linhas, na ordem da lista, com a situação atual de cada uma. */
export function listaParaEnvio(
  jogadores: readonly Jogador[],
  marcacoes: Marcacoes,
): { jogadorId: string; situacao: SituacaoPresenca }[] {
  return jogadores.map((j) => ({ jogadorId: j.id, situacao: marcacoes[j.id] ?? j.situacao }));
}
