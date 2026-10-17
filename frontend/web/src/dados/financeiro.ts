import { mesFinanceiro } from '@pelada/contrato';
import { useQuery } from '@tanstack/react-query';
import { ler } from './cliente';
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
