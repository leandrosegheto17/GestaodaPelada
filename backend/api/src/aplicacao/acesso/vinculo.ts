import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as vinculos from '../../infraestrutura/db/repositorios/vinculos.js';

export interface VinculoAtual {
  grupoId: string;
  acessaFinanceiro: boolean;
}

/**
 * Vínculo da conta com o grupo, lido a cada requisição. Grupo arquivado conta como inexistente
 * para quem administra (o dono reativa pela área do dono).
 */
export async function carregarVinculo(db: ExecutorDb, grupoId: string, contaId: string): Promise<VinculoAtual | null> {
  const vinculo = await vinculos.buscar(db, grupoId, contaId);
  if (!vinculo || vinculo.grupoArquivado) return null;
  return { grupoId, acessaFinanceiro: vinculo.acessaFinanceiro };
}
