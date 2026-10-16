import { usoPorSemana } from '@pelada/contrato';
import { useQuery } from '@tanstack/react-query';
import { ler } from './cliente';
import { chaveGrupo } from './grupo';

export function useUso(grupoId: string) {
  return useQuery({
    queryKey: [...chaveGrupo(grupoId), 'uso'] as const,
    queryFn: ({ signal }) => ler(`/grupos/${encodeURIComponent(grupoId)}/uso`, usoPorSemana, { signal }),
  });
}
