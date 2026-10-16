import type { EscopoSessao } from '@pelada/contrato';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import type { ExecutorDb } from '../../src/infraestrutura/db/index.js';
import * as sessoes from '../../src/infraestrutura/db/repositorios/sessoes.js';
import { gerarTokenSessao, hashToken } from '../../src/infraestrutura/seguranca/token.js';
import type { Fabrica } from './fabrica.js';

export interface SessaoDeTeste {
  token: string;
  /** Valor do cabeçalho `Cookie` pronto para o cliente de teste. */
  cookie: string;
}

/** Cria uma sessão para a conta pelo repositório e registra a limpeza. */
export async function entrarComo(
  db: ExecutorDb,
  fabrica: Fabrica,
  contaId: string,
  opcoes: { escopo?: EscopoSessao; agora?: Date } = {},
): Promise<SessaoDeTeste> {
  const token = gerarTokenSessao();
  const tokenHash = await hashToken(token);
  await sessoes.criar(db, {
    contaId,
    tokenHash,
    escopo: opcoes.escopo ?? 'completo',
    agora: opcoes.agora ?? new Date('2026-10-16T12:00:00Z'),
  });
  fabrica.registrar(async () => {
    await kyselyDe(db).deleteFrom('sessoes').where('conta_id', '=', contaId).execute();
  });
  return { token, cookie: `__Host-sessao=${token}` };
}
