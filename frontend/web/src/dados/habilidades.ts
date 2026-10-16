import { habilidade, listaHabilidades } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler, semCorpo } from './cliente';
import { chaveGrupo } from './grupo';

export const chavesHabilidades = (grupoId: string) => [...chaveGrupo(grupoId), 'habilidades'] as const;

const base = (grupoId: string) => `/grupos/${encodeURIComponent(grupoId)}/habilidades`;
const daHabilidade = (grupoId: string, id: string) => `${base(grupoId)}/${encodeURIComponent(id)}`;

/** Catálogo de habilidades do grupo, na ordem de cadastro. */
export function useHabilidades(grupoId: string) {
  return useQuery({
    queryKey: chavesHabilidades(grupoId),
    queryFn: ({ signal }) => ler(base(grupoId), listaHabilidades, { signal }),
  });
}

/**
 * Qualquer mudança no catálogo invalida o grupo inteiro: o nível dos jogadores (lista e ficha), a contagem do
 * início e o contexto do simulador moram sob a chave do grupo.
 */
function useDepois(grupoId: string) {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) });
}

export function useCriarHabilidade(grupoId: string) {
  const depois = useDepois(grupoId);
  return useMutation({
    mutationFn: (nome: string) => escrever('POST', base(grupoId), { nome }, habilidade),
    onSuccess: depois,
  });
}

export function useRenomearHabilidade(grupoId: string) {
  const depois = useDepois(grupoId);
  return useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) =>
      escrever('PATCH', daHabilidade(grupoId, id), { nome }, habilidade),
    onSuccess: depois,
  });
}

export function useExcluirHabilidade(grupoId: string) {
  const depois = useDepois(grupoId);
  return useMutation({
    mutationFn: (id: string) => escrever('DELETE', daHabilidade(grupoId, id), undefined, semCorpo),
    onSuccess: depois,
  });
}
