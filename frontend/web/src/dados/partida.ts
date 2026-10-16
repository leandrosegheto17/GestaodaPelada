import { partidaDetalhe, partidaNova } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ler, escrever } from './cliente';
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
