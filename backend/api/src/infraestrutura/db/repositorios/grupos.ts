import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

export interface Grupo {
  id: string;
  nome: string;
  slug: string;
  diaSemana: string;
  frequencia: string;
  /** `HH:MM`. */
  horario: string;
  situacaoComercial: string;
  /** `AAAA-MM-DD` ou nulo. */
  trialInicio: string | null;
  arquivadoEm: Date | null;
  criadoPor: string;
  criadoEm: Date;
}

export class SlugEmUso extends Error {
  constructor() {
    super('Slug já usado por outro grupo.');
  }
}

interface LinhaGrupo {
  id: string;
  nome: string;
  slug: string;
  dia_semana: string;
  frequencia: string;
  horario: string;
  situacao_comercial: string;
  trial_inicio: string | null;
  arquivado_em: Date | null;
  criado_por: string;
  criado_em: Date;
}

const paraGrupo = (l: LinhaGrupo): Grupo => ({
  id: l.id,
  nome: l.nome,
  slug: l.slug,
  diaSemana: l.dia_semana,
  frequencia: l.frequencia,
  horario: l.horario,
  situacaoComercial: l.situacao_comercial,
  trialInicio: l.trial_inicio,
  arquivadoEm: l.arquivado_em,
  criadoPor: l.criado_por,
  criadoEm: l.criado_em,
});

const selecionarGrupo = (ex: ExecutorDb) =>
  kyselyDe(ex)
    .selectFrom('grupos')
    .select([
      'id',
      'nome',
      'slug',
      'dia_semana',
      'frequencia',
      sql<string>`to_char(horario, 'HH24:MI')`.as('horario'),
      'situacao_comercial',
      'trial_inicio',
      'arquivado_em',
      'criado_por',
      'criado_em',
    ]);

export async function buscarPorId(ex: ExecutorDb, grupoId: string): Promise<Grupo | null> {
  const linha = await selecionarGrupo(ex).where('id', '=', grupoId).executeTakeFirst();
  return linha ? paraGrupo(linha) : null;
}

/** Inclui grupo arquivado: quem decide "indisponível" é a rota. */
export async function buscarPorSlug(ex: ExecutorDb, slug: string): Promise<Grupo | null> {
  const linha = await selecionarGrupo(ex).where('slug', '=', slug).executeTakeFirst();
  return linha ? paraGrupo(linha) : null;
}

/** Slugs que podem colidir com a base (`base`, `base-2`…), inclusive de grupos arquivados. */
export async function slugsComBase(ex: ExecutorDb, base: string): Promise<string[]> {
  const prefixo = `${base.replace(/[\\%_]/g, '\\$&')}-%`;
  const linhas = await kyselyDe(ex)
    .selectFrom('grupos')
    .select('slug')
    .where((eb) => eb.or([eb('slug', '=', base), eb('slug', 'like', prefixo)]))
    .execute();
  return linhas.map((l) => l.slug);
}

export interface NovoGrupo {
  nome: string;
  slug: string;
  diaSemana: string;
  frequencia: string;
  horario: string;
  criadoPor: string;
  agora: Date;
}

/** Violação do índice único do slug vira `SlugEmUso`; a nova tentativa é do caso de uso. */
export async function criar(ex: ExecutorDb, novo: NovoGrupo): Promise<string> {
  try {
    const linha = await kyselyDe(ex)
      .insertInto('grupos')
      .values({
        nome: novo.nome,
        slug: novo.slug,
        dia_semana: novo.diaSemana,
        frequencia: novo.frequencia,
        horario: novo.horario,
        criado_por: novo.criadoPor,
        criado_em: novo.agora,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return linha.id;
  } catch (erro) {
    const pg = erro as { code?: string; constraint?: string };
    if (pg.code === '23505' && pg.constraint === 'grupos_slug_key') throw new SlugEmUso();
    throw erro;
  }
}

/** O tipo não tem `slug`: o endereço público nunca muda. */
export async function atualizarDados(
  ex: ExecutorDb,
  grupoId: string,
  dados: { nome: string; diaSemana: string; frequencia: string; horario: string },
): Promise<boolean> {
  const r = await kyselyDe(ex)
    .updateTable('grupos')
    .set({
      nome: dados.nome,
      dia_semana: dados.diaSemana,
      frequencia: dados.frequencia,
      horario: dados.horario,
    })
    .where('id', '=', grupoId)
    .executeTakeFirst();
  return Number(r.numUpdatedRows) > 0;
}

export async function alterarSituacao(
  ex: ExecutorDb,
  grupoId: string,
  dados: { situacao: string; trialInicio: string | null },
): Promise<boolean> {
  const r = await kyselyDe(ex)
    .updateTable('grupos')
    .set({ situacao_comercial: dados.situacao, trial_inicio: dados.trialInicio })
    .where('id', '=', grupoId)
    .executeTakeFirst();
  return Number(r.numUpdatedRows) > 0;
}

export async function arquivar(ex: ExecutorDb, grupoId: string, agora: Date): Promise<boolean> {
  const r = await kyselyDe(ex)
    .updateTable('grupos')
    .set({ arquivado_em: agora })
    .where('id', '=', grupoId)
    .executeTakeFirst();
  return Number(r.numUpdatedRows) > 0;
}

export async function reativar(ex: ExecutorDb, grupoId: string): Promise<boolean> {
  const r = await kyselyDe(ex)
    .updateTable('grupos')
    .set({ arquivado_em: null })
    .where('id', '=', grupoId)
    .executeTakeFirst();
  return Number(r.numUpdatedRows) > 0;
}

export interface GrupoComAdmins extends Grupo {
  /** Nomes dos admins, por ordem alfabética. */
  admins: string[];
}

/** Painel do dono: todos os grupos (metadados) com os nomes dos admins, numa só consulta. */
export async function listarTodosComAdmins(ex: ExecutorDb): Promise<GrupoComAdmins[]> {
  const resultado = await sql<LinhaGrupo & { admins: string[] }>`
    SELECT g.id, g.nome, g.slug, g.dia_semana, g.frequencia, to_char(g.horario, 'HH24:MI') AS horario,
           g.situacao_comercial, g.trial_inicio, g.arquivado_em, g.criado_por, g.criado_em,
           coalesce(array_agg(c.nome ORDER BY c.nome) FILTER (WHERE c.id IS NOT NULL), '{}') AS admins
    FROM grupos g
    LEFT JOIN vinculos_admin v ON v.grupo_id = g.id
    LEFT JOIN contas c ON c.id = v.conta_id
    GROUP BY g.id
    ORDER BY g.nome
  `.execute(kyselyDe(ex));
  return resultado.rows.map((l) => ({ ...paraGrupo(l), admins: l.admins }));
}
