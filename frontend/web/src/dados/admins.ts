import { adminAdicionado, listaAdmins, senhaExibida } from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler, semCorpo } from './cliente';
import { chaveGrupo } from './grupo';
import { chaveSessao } from './sessao';

export const chaveAdmins = (grupoId: string) => [...chaveGrupo(grupoId), 'admins'] as const;

const base = (grupoId: string) => `/grupos/${encodeURIComponent(grupoId)}/admins`;
const doAdmin = (grupoId: string, contaId: string) => `${base(grupoId)}/${encodeURIComponent(contaId)}`;

export function useAdmins(grupoId: string) {
  return useQuery({
    queryKey: chaveAdmins(grupoId),
    queryFn: ({ signal }) => ler(base(grupoId), listaAdmins, { signal }),
  });
}

/** Qualquer mudança nos admins invalida o grupo (contagem do início, permissões). */
function useDepois(grupoId: string, tambemSessao = false) {
  const cliente = useQueryClient();
  return async () => {
    await cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) });
    if (tambemSessao) await cliente.invalidateQueries({ queryKey: chaveSessao });
  };
}

/** A senha temporária vem na resposta: quem usa deve chamar `reset()` ao fechar o diálogo (ADR-015). */
export function useAdicionarAdmin(grupoId: string) {
  const depois = useDepois(grupoId);
  return useMutation({
    mutationFn: (corpo: { nome: string; email: string }) => escrever('POST', base(grupoId), corpo, adminAdicionado),
    onSuccess: depois,
  });
}

export function useRedefinirSenha(grupoId: string) {
  return useMutation({
    mutationFn: (contaId: string) => escrever('POST', `${doAdmin(grupoId, contaId)}/redefinir-senha`, {}, senhaExibida),
  });
}

export function useRemoverAdmin(grupoId: string) {
  const depois = useDepois(grupoId, true);
  return useMutation({
    mutationFn: (contaId: string) => escrever('DELETE', doAdmin(grupoId, contaId), undefined, semCorpo),
    onSuccess: depois,
  });
}

export function useFinanceiroAdmin(grupoId: string) {
  const cliente = useQueryClient();
  const depois = useDepois(grupoId, true);
  return useMutation({
    mutationFn: ({ contaId, acessaFinanceiro }: { contaId: string; acessaFinanceiro: boolean }) =>
      escrever('PATCH', `${doAdmin(grupoId, contaId)}/financeiro`, { acessaFinanceiro }, listaAdmins),
    onSuccess: async (lista) => {
      cliente.setQueryData(chaveAdmins(grupoId), lista);
      await depois();
    },
  });
}
