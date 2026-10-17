import { type MarcarPagamentoCorpo, mesFinanceiro } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler, semCorpo } from './cliente';
import { chaveGrupo } from './grupo';

/** Tudo do financeiro mora sob esta chave: invalidá-la refaz o mês, o saldo e os lançamentos. */
export const chaveFinanceiro = (grupoId: string) => [...chaveGrupo(grupoId), 'financeiro'] as const;

export const caminhoFinanceiro = (grupoId: string) => `/grupos/${encodeURIComponent(grupoId)}/financeiro`;

/**
 * O mês do caixa. Sem `mes`, o servidor escolhe o corrente (o relógio é dele). Dado financeiro fica só em
 * memória: nunca é guardado no aparelho.
 */
export function useFinanceiroMes(grupoId: string, mes?: string) {
  return useQuery({
    queryKey: [...chaveFinanceiro(grupoId), 'mes', mes ?? 'atual'],
    queryFn: ({ signal }) =>
      ler(
        `${caminhoFinanceiro(grupoId)}/mes${mes ? `?${new URLSearchParams({ mes }).toString()}` : ''}`,
        mesFinanceiro,
        {
          signal,
        },
      ),
    staleTime: 0,
  });
}

const caminhoPagamentos = (grupoId: string) => `${caminhoFinanceiro(grupoId)}/pagamentos`;

/** Saldos e "não pagaram" vêm da API: depois de gravar, refaz o financeiro e o resumo do grupo. */
function useRefazerFinanceiro(grupoId: string) {
  const cliente = useQueryClient();
  return () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: chaveFinanceiro(grupoId) }),
      cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) }),
    ]);
}

/** Marca o pagamento do mês; a API cria a entrada vinculada no caixa na mesma transação. */
export function useMarcarPagamento(grupoId: string) {
  const refazer = useRefazerFinanceiro(grupoId);
  return useMutation({
    mutationFn: (corpo: MarcarPagamentoCorpo) => escrever('POST', caminhoPagamentos(grupoId), corpo, semCorpo),
    onSettled: refazer,
  });
}

/** Desmarca o pagamento: a API remove a entrada vinculada. */
export function useDesmarcarPagamento(grupoId: string) {
  const refazer = useRefazerFinanceiro(grupoId);
  return useMutation({
    mutationFn: ({ jogadorId, mes }: MarcarPagamentoCorpo) =>
      escrever(
        'DELETE',
        `${caminhoPagamentos(grupoId)}/${encodeURIComponent(jogadorId)}/${encodeURIComponent(mes)}`,
        undefined,
        semCorpo,
      ),
    onSettled: refazer,
  });
}
