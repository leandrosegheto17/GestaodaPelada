import { randomBytes } from 'node:crypto';
import type { ExecutorDb } from '../../../src/infraestrutura/db/index.js';
import * as grupos from '../../../src/infraestrutura/db/repositorios/grupos.js';
import * as vinculos from '../../../src/infraestrutura/db/repositorios/vinculos.js';
import type { Fabrica } from '../fabrica.js';
import { executarSql } from '../sql.js';
import { criarConta } from './contas.js';

const AGORA = new Date('2026-10-16T12:00:00Z');

export interface GrupoCriado {
  id: string;
  slug: string;
  nome: string;
  criadoPor: string;
}

/** Cria um grupo (e a conta que o criou, se faltar) e registra a limpeza. */
export async function criarGrupo(
  db: ExecutorDb,
  fabrica: Fabrica,
  opcoes: { criadoPor?: string; nome?: string; slug?: string; agora?: Date } = {},
): Promise<GrupoCriado> {
  const criadoPor = opcoes.criadoPor ?? (await criarConta(db, fabrica)).id;
  const slug = opcoes.slug ?? `teste-${randomBytes(5).toString('hex')}`;
  const nome = opcoes.nome ?? 'Pelada de Teste';
  const id = await grupos.criar(db, {
    nome,
    slug,
    diaSemana: 'quinta',
    frequencia: 'semanal',
    horario: '20:00',
    criadoPor,
    agora: opcoes.agora ?? AGORA,
  });
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM auditoria WHERE grupo_id = $1', [id]);
    await executarSql('DELETE FROM vinculos_admin WHERE grupo_id = $1', [id]);
    await executarSql('DELETE FROM grupos WHERE id = $1', [id]);
  });
  return { id, slug, nome, criadoPor };
}

/** Vincula uma conta como admin do grupo. */
export async function vincularAdmin(
  db: ExecutorDb,
  grupoId: string,
  contaId: string,
  opcoes: { acessaFinanceiro?: boolean; criadoPor?: string } = {},
): Promise<void> {
  await vinculos.criar(db, grupoId, {
    contaId,
    acessaFinanceiro: opcoes.acessaFinanceiro ?? false,
    criadoPor: opcoes.criadoPor ?? contaId,
    agora: AGORA,
  });
}
