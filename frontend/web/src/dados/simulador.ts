import {
  avaliacaoSimulador,
  contextoSimulador,
  escalacaoConfirmada,
  previaSimulador,
  sugestaoSimulador,
  type AvaliarCorpo,
  type EntradaPrevia,
  type EntradaSimulador,
  type EscalacaoCorpo,
} from '@pelada/contrato';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler } from './cliente';
import { chaveGrupo } from './grupo';

/** Tudo do simulador mora sob a chave do grupo e a do próprio simulador (nível e notas a invalidam). */
export const chaveSimulador = (grupoId: string) => [...chaveGrupo(grupoId), 'simulador'] as const;

const base = (grupoId: string) => `/grupos/${encodeURIComponent(grupoId)}/simulador`;

/** Quem pode jogar na data (padrão: o próximo dia de jogo), com o nível de cada um. */
export function useContextoSimulador(grupoId: string, data: string | null) {
  const consulta = data ? `?${new URLSearchParams({ data }).toString()}` : '';
  return useQuery({
    queryKey: [...chaveSimulador(grupoId), 'contexto', data],
    queryFn: ({ signal }) => ler(`${base(grupoId)}/contexto${consulta}`, contextoSimulador, { signal }),
    // Trocar a data mantém a lista anterior na tela até a nova chegar.
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

/** Prévia de quantos times saem. Com `entrada` nula, não consulta. A requisição antiga é abortada. */
export function usePrevia(grupoId: string, entrada: EntradaPrevia | null) {
  return useQuery({
    queryKey: [...chaveSimulador(grupoId), 'previa', entrada],
    queryFn: ({ signal }) => escrever('POST', `${base(grupoId)}/previa`, entrada, previaSimulador, { signal }),
    enabled: entrada !== null,
    staleTime: 60_000,
  });
}

/** Reavalia uma composição ajustada à mão (sem refazer a sugestão). A requisição pode ser abortada. */
export function avaliarComposicao(grupoId: string, corpo: AvaliarCorpo, signal?: AbortSignal) {
  return escrever('POST', `${base(grupoId)}/avaliar`, corpo, avaliacaoSimulador, signal ? { signal } : {});
}

/**
 * Sugestão de times para a entrada. A mesma entrada dá sempre a mesma resposta, então não se refaz sozinha;
 * `rodada` muda quando a pessoa pede "Refazer sugestão".
 */
export function useSugerir(grupoId: string, entrada: EntradaSimulador | null, rodada: number) {
  return useQuery({
    queryKey: [...chaveSimulador(grupoId), 'sugestao', rodada, entrada],
    queryFn: ({ signal }) => escrever('POST', `${base(grupoId)}/sugerir`, entrada, sugestaoSimulador, { signal }),
    enabled: entrada !== null,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
}

/** Confirma a escalação da data (substitui a anterior). Invalida o grupo: o início mostra a data confirmada. */
export function useConfirmarEscalacao(grupoId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (corpo: EscalacaoCorpo) =>
      escrever('POST', `/grupos/${encodeURIComponent(grupoId)}/escalacoes`, corpo, escalacaoConfirmada),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) }),
  });
}
