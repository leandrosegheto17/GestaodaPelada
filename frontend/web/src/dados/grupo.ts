import { grupoDetalhe } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler } from './cliente';
import { chaveSessao } from './sessao';

export const chaveGrupo = (grupoId: string) => ['grupo', grupoId] as const;

/** Detalhe do grupo do admin. A mesma chave serve à barra e à tela de início (um só pedido). */
export function useGrupo(grupoId: string) {
  return useQuery({
    queryKey: chaveGrupo(grupoId),
    queryFn: () => ler(`/grupos/${encodeURIComponent(grupoId)}`, grupoDetalhe),
  });
}

export interface CorpoGrupo {
  nome: string;
  diaSemana: string;
  frequencia: string;
  horario: string;
}

/** Edita nome, dia, frequência e horário (nunca o link). A barra troca o nome na hora. */
export function useEditarGrupo(grupoId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (corpo: CorpoGrupo) => escrever('PATCH', `/grupos/${encodeURIComponent(grupoId)}`, corpo, grupoDetalhe),
    onSuccess: async (detalhe) => {
      cliente.setQueryData(chaveGrupo(grupoId), detalhe);
      await cliente.invalidateQueries({ queryKey: chaveSessao });
    },
  });
}
