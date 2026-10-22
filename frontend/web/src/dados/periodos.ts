import { periodoCorrigirResposta, periodoPreviaResposta, type PeriodoCorrigirCorpo } from '@pelada/contrato';
import { useMutation } from '@tanstack/react-query';
import { escrever } from './cliente';
import { caminhoJogador, useInvalidarGrupo } from './elenco';

export const caminhoPeriodo = (grupoId: string, jogadorId: string, periodoId: string) =>
  `${caminhoJogador(grupoId, jogadorId)}/periodos/${encodeURIComponent(periodoId)}`;

/** Efeito de corrigir um período (ou de reativar com retorno retroativo), sem gravar; o cálculo é da API. */
export function usePreviaPeriodos<Corpo extends object>(caminhoDaPrevia: string) {
  return useMutation({
    mutationFn: (corpo: Corpo) => escrever('POST', caminhoDaPrevia, corpo, periodoPreviaResposta),
  });
}

export function useCorrigirPeriodo(grupoId: string, jogadorId: string, periodoId: string) {
  const invalidar = useInvalidarGrupo(grupoId);
  return useMutation({
    mutationFn: (corpo: PeriodoCorrigirCorpo) =>
      escrever('PUT', caminhoPeriodo(grupoId, jogadorId, periodoId), corpo, periodoCorrigirResposta),
    onSuccess: invalidar,
  });
}
