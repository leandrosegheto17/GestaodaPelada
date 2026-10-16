import { grupoDono } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler } from '../cliente';
import { chavesDono } from './chaves';

const caminho = (grupoId: string) => `/dono/grupos/${encodeURIComponent(grupoId)}`;

export function useGrupoDono(grupoId: string) {
  return useQuery({
    queryKey: chavesDono.grupo(grupoId),
    queryFn: ({ signal }) => ler(caminho(grupoId), grupoDono, { signal }),
  });
}

/** As três escritas respondem o grupo atualizado: guarda na chave do grupo e refaz o painel. */
function useAtualizacao(grupoId: string) {
  const cliente = useQueryClient();
  return async (atualizado: unknown) => {
    cliente.setQueryData(chavesDono.grupo(grupoId), atualizado);
    await cliente.invalidateQueries({ queryKey: chavesDono.painel });
  };
}

export function useSalvarSituacao(grupoId: string) {
  const aoSucesso = useAtualizacao(grupoId);
  return useMutation({
    mutationFn: (corpo: { situacaoComercial: string; inicioTrial: string | null }) =>
      escrever('PATCH', `${caminho(grupoId)}/situacao`, corpo, grupoDono),
    onSuccess: aoSucesso,
  });
}

/** A igualdade exata do nome é conferida na API; o diálogo só evita o clique acidental. */
export function useArquivarGrupo(grupoId: string) {
  const aoSucesso = useAtualizacao(grupoId);
  return useMutation({
    mutationFn: (nomeConfirmacao: string) =>
      escrever('POST', `${caminho(grupoId)}/arquivar`, { nomeConfirmacao }, grupoDono),
    onSuccess: aoSucesso,
  });
}

export function useReativarGrupo(grupoId: string) {
  const aoSucesso = useAtualizacao(grupoId);
  return useMutation({
    mutationFn: () => escrever('POST', `${caminho(grupoId)}/reativar`, {}, grupoDono),
    onSuccess: aoSucesso,
  });
}
