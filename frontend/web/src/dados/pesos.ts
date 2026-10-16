import { painelPesos } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler } from './cliente';
import { chaveGrupo } from './grupo';

export const chavePesos = (grupoId: string) => [...chaveGrupo(grupoId), 'pesos'] as const;

const caminho = (grupoId: string) => `/grupos/${encodeURIComponent(grupoId)}/pesos`;

export function usePesos(grupoId: string) {
  return useQuery({
    queryKey: chavePesos(grupoId),
    queryFn: ({ signal }) => ler(caminho(grupoId), painelPesos, { signal }),
  });
}

export interface CorpoPesos {
  presencaSemChuva: number;
  presencaComChuva: number;
  lesionadoSemChuva: number;
  lesionadoComChuva: number;
  expulso: number;
}

/** A vigência é sempre o "hoje" do servidor: o corpo leva só os 5 inteiros. */
export function useSalvarPesos(grupoId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (corpo: CorpoPesos) => escrever('POST', caminho(grupoId), corpo, painelPesos),
    onSuccess: async (painel) => {
      cliente.setQueryData(chavePesos(grupoId), painel);
      await cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId), exact: true });
    },
  });
}
