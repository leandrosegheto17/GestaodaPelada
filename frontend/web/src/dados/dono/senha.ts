import { senhaExibida } from '@pelada/contrato';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { escrever } from '../cliente';
import { chavesDono } from './chaves';

/**
 * Redefine a senha de uma conta (dono). A senha temporária só existe no resultado da mutação:
 * quem usa deve chamar `reset()` ao fechar o diálogo (ADR-015).
 */
export function useRedefinirSenhaConta() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (contaId: string) =>
      escrever('POST', `/dono/contas/${encodeURIComponent(contaId)}/redefinir-senha`, {}, senhaExibida),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chavesDono.painel }),
  });
}
