import { randomBytes } from 'node:crypto';
import type { ExecutorDb } from '../../../src/infraestrutura/db/index.js';
import * as contas from '../../../src/infraestrutura/db/repositorios/contas.js';
import type { Fabrica } from '../fabrica.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';

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
    const banco = kyselyDe(db);
    await banco.deleteFrom('sessoes').where('conta_id', '=', id).execute();
    await banco
      .deleteFrom('pedidos_reset')
      .where((eb) => eb.or([eb('conta_id', '=', id), eb('resolvido_por', '=', id)]))
      .execute();
    await banco.deleteFrom('partidas').where('alterada_por', '=', id).execute();
    await banco.deleteFrom('auditoria').where('autor_conta_id', '=', id).execute();
    await banco
      .deleteFrom('vinculos_admin')
      .where((eb) => eb.or([eb('conta_id', '=', id), eb('criado_por', '=', id)]))
      .execute();
    await banco.deleteFrom('tentativas_login').where('email', '=', email).execute();
    await banco.deleteFrom('contas').where('id', '=', id).execute();
  });
  return { id, email, senha };
}
