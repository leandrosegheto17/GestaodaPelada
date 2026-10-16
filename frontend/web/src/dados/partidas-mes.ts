import { partidasDoMes } from '@pelada/contrato';
import { useQuery } from '@tanstack/react-query';
import { ler } from './cliente';
import { chaveGrupo } from './grupo';

export const chavePartidasDoMes = (grupoId: string, mes: string) => [...chaveGrupo(grupoId), 'partidas', mes] as const;

/** Partidas de um mês. A chave começa pela do grupo: invalidar o grupo invalida a lista. */
export function usePartidasDoMes(grupoId: string, mes: string | undefined) {
  return useQuery({
    queryKey: chavePartidasDoMes(grupoId, mes ?? ''),
    queryFn: ({ signal }) =>
      ler(`/grupos/${encodeURIComponent(grupoId)}/partidas?mes=${encodeURIComponent(mes ?? '')}`, partidasDoMes, {
        signal,
      }),
    enabled: mes !== undefined,
  });
}
