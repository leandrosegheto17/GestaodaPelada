import { painelDono } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler, semCorpo } from '../cliente';
import { chavesDono } from './chaves';

export function usePainelDono() {
  return useQuery({
    queryKey: chavesDono.painel,
    queryFn: ({ signal }) => ler('/dono/painel', painelDono, { signal }),
  });
}

/** `contaId` identifica o pedido (há no máximo um pendente por conta). */
export function useResolverPedido() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (contaId: string) =>
      escrever('POST', `/dono/pedidos-reset/${encodeURIComponent(contaId)}/resolver`, {}, semCorpo),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chavesDono.painel }),
  });
}
