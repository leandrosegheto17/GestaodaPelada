import { grupoCriado } from '@pelada/contrato';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { escrever } from '../cliente';
import { chavesDono } from './chaves';

export interface CorpoNovoGrupo {
  nome: string;
  diaSemana: string;
  frequencia: string;
  horario: string;
  adminNome: string;
  adminEmail: string;
}

/**
 * Cria o grupo e o primeiro admin. O corpo nunca leva `slug` (a API gera, ADR-016). A senha temporária
 * vem no resultado: quem usa deve chamar `reset()` antes de sair da tela (ADR-015).
 */
export function useCriarGrupo() {
  const cliente = useQueryClient();
  return useMutation({
    // sem retenção no cache de mutações depois do reset(): a senha não pode ficar em memória
    gcTime: 0,
    mutationFn: (corpo: CorpoNovoGrupo) => escrever('POST', '/dono/grupos', corpo, grupoCriado),
    onSuccess: () => cliente.invalidateQueries({ queryKey: chavesDono.todas }),
  });
}
