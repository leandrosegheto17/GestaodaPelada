import { grupoDetalhe } from '@pelada/contrato';
import { useQuery } from '@tanstack/react-query';
import { ler } from './cliente';

export const chaveGrupo = (grupoId: string) => ['grupo', grupoId] as const;

/** Detalhe do grupo do admin. A mesma chave serve à barra e à tela de início (um só pedido). */
export function useGrupo(grupoId: string) {
  return useQuery({
    queryKey: chaveGrupo(grupoId),
    queryFn: () => ler(`/grupos/${encodeURIComponent(grupoId)}`, grupoDetalhe),
  });
}
