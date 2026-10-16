import { randomBytes } from 'node:crypto';
import type { ExecutorDb } from '../../../src/infraestrutura/db/index.js';
import * as contas from '../../../src/infraestrutura/db/repositorios/contas.js';
import type { Fabrica } from '../fabrica.js';
import { executarSql } from '../sql.js';

export const SENHA_PADRAO = 'senha-de-teste-123';

export interface ContaCriada {
  id: string;
  email: string;
  senha: string;
}

/** Cria uma conta comum pelo repositório e registra a limpeza (filhos primeiro, depois a conta). */
export async function criarConta(
  db: ExecutorDb,
  fabrica: Fabrica,
  opcoes: { temporaria?: boolean; senha?: string; agora?: Date; nome?: string } = {},
): Promise<ContaCriada> {
  const email = `conta-${randomBytes(5).toString('hex')}@teste.invalid`;
  const senha = opcoes.senha ?? SENHA_PADRAO;
  const id = await contas.criar(db, {
    email,
    nome: opcoes.nome ?? 'Conta de Teste',
    senha,
    senhaTemporaria: opcoes.temporaria ?? false,
    agora: opcoes.agora ?? new Date('2026-10-16T12:00:00Z'),
  });
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM sessoes WHERE conta_id = $1', [id]);
    await executarSql('DELETE FROM pedidos_reset WHERE conta_id = $1 OR resolvido_por = $1', [id]);
    await executarSql('DELETE FROM auditoria WHERE autor_conta_id = $1', [id]);
    await executarSql('DELETE FROM vinculos_admin WHERE conta_id = $1 OR criado_por = $1', [id]);
    await executarSql('DELETE FROM tentativas_login WHERE email = $1', [email]);
    await executarSql('DELETE FROM contas WHERE id = $1', [id]);
  });
  return { id, email, senha };
}
