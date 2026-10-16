import { partidaDetalhe, partidaNova } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ler, escrever, semCorpo } from './cliente';
import { chaveGrupo } from './grupo';

export const chavePartidaNova = (grupoId: string, data: string | undefined) =>
  [...chaveGrupo(grupoId), 'partida-nova', data ?? ''] as const;

/** Jogadores ativos numa data (ou na sugerida pela API, se `data` for omitida) com a marcação inicial. */
export function usePartidaNova(grupoId: string, data: string | undefined) {
  return useQuery({
    queryKey: chavePartidaNova(grupoId, data),
    queryFn: ({ signal }) =>
      ler(
        `/grupos/${encodeURIComponent(grupoId)}/partidas/nova${data ? `?data=${encodeURIComponent(data)}` : ''}`,
        partidaNova,
        { signal },
      ),
    // A lista de ativos depende da data e das marcações do momento: cada visita busca de novo.
    staleTime: 0,
    gcTime: 0,
  });
}

export interface CorpoSalvarPartida {
  data: string;
  choveu: boolean;
  marcacoes: { jogadorId: string; situacao: string }[];
}

/** Lança a partida. Sem repetição automática: reenviar é decisão da pessoa (evita partida duplicada). */
export function useSalvarPartida(grupoId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (corpo: CorpoSalvarPartida) =>
      escrever('POST', `/grupos/${encodeURIComponent(grupoId)}/partidas`, corpo, partidaDetalhe),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) }),
  });
}

export const chavePartida = (grupoId: string, data: string) => [...chaveGrupo(grupoId), 'partida', data] as const;

const caminhoPartida = (grupoId: string, data: string) =>
  `/grupos/${encodeURIComponent(grupoId)}/partidas/${encodeURIComponent(data)}`;

/** Partida já lançada, com as presenças e quem a alterou por último. Sempre busca de novo ao abrir. */
export function usePartida(grupoId: string, data: string, habilitado = true) {
  return useQuery({
    queryKey: chavePartida(grupoId, data),
    queryFn: ({ signal }) => ler(caminhoPartida(grupoId, data), partidaDetalhe, { signal }),
    enabled: habilitado,
    staleTime: 0,
    gcTime: 0,
  });
}

/** Substitui `choveu` e as presenças; a data não muda. Sem repetição automática. */
export function useEditarPartida(grupoId: string, data: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (corpo: CorpoSalvarPartida) => escrever('PUT', caminhoPartida(grupoId, data), corpo, partidaDetalhe),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) }),
  });
}

/** Exclui a partida e as presenças (204). A API recalcula os pontos. */
export function useExcluirPartida(grupoId: string, data: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () => escrever('DELETE', caminhoPartida(grupoId, data), undefined, semCorpo),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) }),
  });
}
