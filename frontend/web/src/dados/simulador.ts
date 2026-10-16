import {
  avaliacaoSimulador,
  contextoSimulador,
  previaSimulador,
  type AvaliarCorpo,
  type EntradaPrevia,
} from '@pelada/contrato';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
