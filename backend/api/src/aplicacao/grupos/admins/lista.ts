import { listaAdmins, type ListaAdmins } from '@pelada/contrato';
import type { ExecutorDb } from '../../../infraestrutura/db/index.js';
import * as vinculos from '../../../infraestrutura/db/repositorios/vinculos.js';

/**
 * Admins do grupo (por nome). `voce` marca a linha de quem pede e `podeGerirFinanceiro` diz se
 * quem pede pode conceder ou retirar o financeiro (RF-18).
 */
export async function montarListaAdmins(
  ex: ExecutorDb,
  grupoId: string,
  atual: { contaId: string; acessaFinanceiro: boolean },
): Promise<ListaAdmins> {
  const admins = await vinculos.adminsDoGrupo(ex, grupoId);
  return listaAdmins.parse({
    admins: admins.map((a) => ({
      contaId: a.contaId,
      nome: a.nome,
      email: a.email,
      acessaFinanceiro: a.acessaFinanceiro,
      voce: a.contaId === atual.contaId,
    })),
    podeGerirFinanceiro: atual.acessaFinanceiro,
  });
}
