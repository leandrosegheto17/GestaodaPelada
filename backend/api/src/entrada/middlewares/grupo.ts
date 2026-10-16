import { CODIGOS_ERRO, uuid } from '@pelada/contrato';
import type { MiddlewareHandler } from 'hono';
import { carregarVinculo as carregarVinculoReal, type VinculoAtual } from '../../aplicacao/acesso/vinculo.js';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import type { AppEnv } from '../app.js';
import { corpoErro, naoEncontrado } from '../erros.js';
import { recusarSemSessaoCompleta } from './sessao.js';

export interface DependenciasVinculo {
  carregarVinculo: (db: ExecutorDb, grupoId: string, contaId: string) => Promise<VinculoAtual | null>;
}

/**
 * Autoriza o acesso a `/api/grupos/:grupoId/*`: id bem formado, sessão completa e vínculo com o
 * grupo (não arquivado). Quem não pode ver recebe o mesmo 404 de um grupo que não existe.
 */
export function criarExigirVinculo(dependencias: DependenciasVinculo): MiddlewareHandler<AppEnv> {
  return async (c, proximo) => {
    const grupoId = c.req.param('grupoId') ?? '';
    if (!uuid.safeParse(grupoId).success) return naoEncontrado(c);
    const recusa = recusarSemSessaoCompleta(c);
    if (recusa) return recusa;
    const sessao = c.var.sessao;
    if (sessao === null) return naoEncontrado(c);
    const vinculo = await dependencias.carregarVinculo(c.var.db(), grupoId, sessao.conta.id);
    if (vinculo === null) return naoEncontrado(c);
    c.set('vinculo', vinculo);
    return proximo();
  };
}

export const exigirVinculo = criarExigirVinculo({ carregarVinculo: carregarVinculoReal });

/** Depois de `exigirVinculo`: o financeiro pede a permissão `acessa_financeiro` (403 para quem já é admin). */
export const exigirFinanceiro: MiddlewareHandler<AppEnv> = async (c, proximo) => {
  if (!c.var.vinculo?.acessaFinanceiro) {
    return c.json(
      corpoErro(CODIGOS_ERRO.semPermissaoFinanceiro, 'Você não tem acesso ao financeiro deste grupo.'),
      403,
    );
  }
  return proximo();
};
