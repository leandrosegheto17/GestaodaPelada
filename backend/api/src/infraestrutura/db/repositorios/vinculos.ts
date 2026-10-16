import { ehTransacao, kyselyDe, type ExecutorDb } from '../cliente.js';

export class VinculoDuplicado extends Error {
  constructor() {
    super('A conta já é admin deste grupo.');
  }
}

export interface Vinculo {
  acessaFinanceiro: boolean;
  grupoArquivado: boolean;
}

/** Uma consulta por requisição: o middleware de vínculo usa isto. */
export async function buscar(ex: ExecutorDb, grupoId: string, contaId: string): Promise<Vinculo | null> {
  const linha = await kyselyDe(ex)
    .selectFrom('vinculos_admin as v')
    .innerJoin('grupos as g', 'g.id', 'v.grupo_id')
    .select(['v.acessa_financeiro', 'g.arquivado_em'])
    .where('v.grupo_id', '=', grupoId)
    .where('v.conta_id', '=', contaId)
    .executeTakeFirst();
  return linha ? { acessaFinanceiro: linha.acessa_financeiro, grupoArquivado: linha.arquivado_em !== null } : null;
}

export interface GrupoDaConta {
  grupoId: string;
  nome: string;
  slug: string;
  diaSemana: string;
  frequencia: string;
  /** `HH:MM`. */
  horario: string;
  acessaFinanceiro: boolean;
}

/** Grupos não arquivados em que a conta é admin, por nome. */
export async function gruposDaConta(ex: ExecutorDb, contaId: string): Promise<GrupoDaConta[]> {
  const linhas = await kyselyDe(ex)
    .selectFrom('vinculos_admin as v')
    .innerJoin('grupos as g', 'g.id', 'v.grupo_id')
    .select(['g.id', 'g.nome', 'g.slug', 'g.dia_semana', 'g.frequencia', 'g.horario', 'v.acessa_financeiro'])
    .where('v.conta_id', '=', contaId)
    .where('g.arquivado_em', 'is', null)
    .orderBy('g.nome')
    .execute();
  return linhas.map((l) => ({
    grupoId: l.id,
    nome: l.nome,
    slug: l.slug,
    diaSemana: l.dia_semana,
    frequencia: l.frequencia,
    horario: l.horario.slice(0, 5),
    acessaFinanceiro: l.acessa_financeiro,
  }));
}

export interface AdminDoGrupo {
  contaId: string;
  nome: string;
  email: string;
  acessaFinanceiro: boolean;
}

export async function adminsDoGrupo(ex: ExecutorDb, grupoId: string): Promise<AdminDoGrupo[]> {
  const linhas = await kyselyDe(ex)
    .selectFrom('vinculos_admin as v')
    .innerJoin('contas as c', 'c.id', 'v.conta_id')
    .select(['c.id', 'c.nome', 'c.email', 'v.acessa_financeiro'])
    .where('v.grupo_id', '=', grupoId)
    .orderBy('c.nome')
    .execute();
  return linhas.map((l) => ({
    contaId: l.id,
    nome: l.nome,
    email: l.email,
    acessaFinanceiro: l.acessa_financeiro,
  }));
}

export async function criar(
  ex: ExecutorDb,
  grupoId: string,
  vinculo: { contaId: string; acessaFinanceiro: boolean; criadoPor: string; agora: Date },
): Promise<void> {
  try {
    await kyselyDe(ex)
      .insertInto('vinculos_admin')
      .values({
        conta_id: vinculo.contaId,
        grupo_id: grupoId,
        acessa_financeiro: vinculo.acessaFinanceiro,
        criado_por: vinculo.criadoPor,
        criado_em: vinculo.agora,
      })
      .execute();
  } catch (erro) {
    if ((erro as { code?: string }).code === '23505') throw new VinculoDuplicado();
    throw erro;
  }
}

export async function remover(ex: ExecutorDb, grupoId: string, contaId: string): Promise<boolean> {
  const r = await kyselyDe(ex)
    .deleteFrom('vinculos_admin')
    .where('grupo_id', '=', grupoId)
    .where('conta_id', '=', contaId)
    .executeTakeFirst();
  return Number(r.numDeletedRows) > 0;
}

export async function alterarAcessaFinanceiro(
  ex: ExecutorDb,
  grupoId: string,
  contaId: string,
  valor: boolean,
): Promise<boolean> {
  const r = await kyselyDe(ex)
    .updateTable('vinculos_admin')
    .set({ acessa_financeiro: valor })
    .where('grupo_id', '=', grupoId)
    .where('conta_id', '=', contaId)
    .executeTakeFirst();
  return Number(r.numUpdatedRows) > 0;
}

/**
 * Número de admins do grupo. Dentro de uma transação, trava a linha do grupo antes de contar:
 * duas remoções simultâneas não deixam o grupo sem admin (RN-13).
 */
export async function contarAdmins(ex: ExecutorDb, grupoId: string): Promise<number> {
  const banco = kyselyDe(ex);
  if (ehTransacao(ex)) {
    await banco.selectFrom('grupos').select('id').where('id', '=', grupoId).forUpdate().execute();
  }
  const linha = await banco
    .selectFrom('vinculos_admin')
    .select((eb) => eb.fn.countAll<string>().as('total'))
    .where('grupo_id', '=', grupoId)
    .executeTakeFirstOrThrow();
  return Number(linha.total);
}
