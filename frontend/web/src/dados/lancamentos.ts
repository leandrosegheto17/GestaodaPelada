import { lancamento, type LancamentoCorpo } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler, semCorpo } from './cliente';
import { caminhoFinanceiro, chaveFinanceiro } from './financeiro';
import { chaveGrupo } from './grupo';

const caminhoLancamentos = (grupoId: string) => `${caminhoFinanceiro(grupoId)}/lancamentos`;
const caminhoLancamento = (grupoId: string, id: string) => `${caminhoLancamentos(grupoId)}/${encodeURIComponent(id)}`;

/** Um lançamento para editar. Sempre busca de novo ao abrir: outro admin pode ter mexido nele. */
export function useLancamento(grupoId: string, id: string, habilitado = true) {
  return useQuery({
    queryKey: [...chaveFinanceiro(grupoId), 'lancamento', id],
    queryFn: ({ signal }) => ler(caminhoLancamento(grupoId, id), lancamento, { signal }),
    enabled: habilitado,
    staleTime: 0,
  });
}

/** Mês do caixa e saldo do início vêm da API: depois de gravar, os dois são refeitos. */
function useRefazerCaixa(grupoId: string) {
  const cliente = useQueryClient();
  return () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: chaveFinanceiro(grupoId) }),
      cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) }),
    ]);
}

export function useCriarLancamento(grupoId: string) {
  const refazer = useRefazerCaixa(grupoId);
  return useMutation({
    mutationFn: (corpo: LancamentoCorpo) => escrever('POST', caminhoLancamentos(grupoId), corpo, lancamento),
    onSuccess: refazer,
  });
}

export function useEditarLancamento(grupoId: string, id: string) {
  const refazer = useRefazerCaixa(grupoId);
  return useMutation({
    mutationFn: (corpo: LancamentoCorpo) => escrever('PUT', caminhoLancamento(grupoId, id), corpo, lancamento),
    onSuccess: refazer,
  });
}

export function useExcluirLancamento(grupoId: string, id: string) {
  const refazer = useRefazerCaixa(grupoId);
  return useMutation({
    mutationFn: () => escrever('DELETE', caminhoLancamento(grupoId, id), undefined, semCorpo),
    onSuccess: refazer,
  });
}
