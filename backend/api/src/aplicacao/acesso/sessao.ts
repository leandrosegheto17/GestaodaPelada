import type { EscopoSessao } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as contas from '../../infraestrutura/db/repositorios/contas.js';
import * as sessoes from '../../infraestrutura/db/repositorios/sessoes.js';
import { hashToken } from '../../infraestrutura/seguranca/token.js';

export interface SessaoAtual {
  sessaoId: string;
  conta: {
    id: string;
    nome: string;
    email: string;
    eDono: boolean;
    avisoPrivacidadeVistoEm: Date | null;
  };
  escopo: EscopoSessao;
  /** A expiração foi estendida: o cookie precisa ser reenviado. */
  renovada: boolean;
}

/** Resolve o token do cookie em sessão e conta, deslizando a expiração. `null` se não vale. */
export async function resolverSessao(db: ExecutorDb, token: string, agora: Date): Promise<SessaoAtual | null> {
  const sessao = await sessoes.buscarValidaEDeslizar(db, await hashToken(token), agora);
  if (!sessao) return null;
  const conta = await contas.buscarPorId(db, sessao.contaId);
  if (!conta) return null;
  return {
    sessaoId: sessao.id,
    conta: {
      id: conta.id,
      nome: conta.nome,
      email: conta.email,
      eDono: conta.eDono,
      avisoPrivacidadeVistoEm: conta.avisoPrivacidadeVistoEm,
    },
    escopo: sessao.escopo,
    renovada: sessao.renovada,
  };
}

/** Encerra a sessão do token (idempotente). */
export async function encerrarSessao(db: ExecutorDb, token: string): Promise<boolean> {
  return sessoes.encerrar(db, await hashToken(token));
}
