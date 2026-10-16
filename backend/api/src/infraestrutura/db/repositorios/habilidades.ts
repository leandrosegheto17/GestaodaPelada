import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

export class NomeHabilidadeEmUso extends Error {
  constructor() {
    super('Já existe uma habilidade com esse nome neste grupo.');
  }
}

const emUso = (erro: unknown): boolean =>
  (erro as { code?: string; constraint?: string }).code === '23505' &&
  (erro as { constraint?: string }).constraint === 'habilidades_nome_grupo';

export interface Habilidade {
  id: string;
  nome: string;
}

/** Em ordem de cadastro. */
export async function listar(ex: ExecutorDb, grupoId: string): Promise<Habilidade[]> {
  return kyselyDe(ex)
    .selectFrom('habilidades')
    .select(['id', 'nome'])
    .where('grupo_id', '=', grupoId)
    .orderBy('ordem')
    .execute();
}

export async function criar(ex: ExecutorDb, grupoId: string, nome: string): Promise<string> {
  try {
    const linha = await kyselyDe(ex)
      .insertInto('habilidades')
      .values({ grupo_id: grupoId, nome })
      .returning('id')
      .executeTakeFirstOrThrow();
    return linha.id;
  } catch (erro) {
    if (emUso(erro)) throw new NomeHabilidadeEmUso();
    throw erro;
  }
}

/** Só o nome muda; as notas continuam. */
export async function renomear(ex: ExecutorDb, grupoId: string, habilidadeId: string, nome: string): Promise<boolean> {
  try {
    const r = await kyselyDe(ex)
      .updateTable('habilidades')
      .set({ nome })
      .where('id', '=', habilidadeId)
      .where('grupo_id', '=', grupoId)
      .executeTakeFirst();
    return Number(r.numUpdatedRows) > 0;
  } catch (erro) {
    if (emUso(erro)) throw new NomeHabilidadeEmUso();
    throw erro;
  }
}

/** As notas da habilidade saem junto (cascata do banco). */
export async function excluir(ex: ExecutorDb, grupoId: string, habilidadeId: string): Promise<boolean> {
  const r = await kyselyDe(ex)
    .deleteFrom('habilidades')
    .where('id', '=', habilidadeId)
    .where('grupo_id', '=', grupoId)
    .executeTakeFirst();
  return Number(r.numDeletedRows) > 0;
}

/** Cria o catálogo inicial (nomes vindos do domínio) com um único INSERT, na ordem dada. */
export async function criarCatalogoInicial(ex: ExecutorDb, grupoId: string, nomes: readonly string[]): Promise<void> {
  try {
    await kyselyDe(ex)
      .insertInto('habilidades')
      .values(nomes.map((nome) => ({ grupo_id: grupoId, nome })))
      .execute();
  } catch (erro) {
    if (emUso(erro)) throw new NomeHabilidadeEmUso();
    throw erro;
  }
}

export interface NotaDoJogador {
  habilidadeId: string;
  habilidade: string;
  nota: number | null;
}

/** O catálogo inteiro do grupo com a nota do jogador (nula onde não há). */
export async function notasDoJogador(ex: ExecutorDb, grupoId: string, jogadorId: string): Promise<NotaDoJogador[]> {
  const r = await sql<{ habilidade_id: string; habilidade: string; nota: number | null }>`
    SELECT h.id AS habilidade_id, h.nome AS habilidade, n.valor AS nota
    FROM habilidades h
    LEFT JOIN notas n ON n.habilidade_id = h.id AND n.grupo_id = h.grupo_id AND n.jogador_id = ${jogadorId}
    WHERE h.grupo_id = ${grupoId}
    ORDER BY h.ordem
  `.execute(kyselyDe(ex));
  return r.rows.map((l) => ({ habilidadeId: l.habilidade_id, habilidade: l.habilidade, nota: l.nota }));
}

export interface NotaDoGrupo {
  jogadorId: string;
  habilidadeId: string;
  nota: number;
}

/** Todas as notas do grupo numa consulta (nível na lista e no simulador). */
export async function notasDoGrupo(ex: ExecutorDb, grupoId: string): Promise<NotaDoGrupo[]> {
  const linhas = await kyselyDe(ex)
    .selectFrom('notas')
    .select(['jogador_id', 'habilidade_id', 'valor'])
    .where('grupo_id', '=', grupoId)
    .execute();
  return linhas.map((l) => ({ jogadorId: l.jogador_id, habilidadeId: l.habilidade_id, nota: l.valor }));
}

/** Grava ou atualiza a nota; `false` se jogador ou habilidade não são do grupo. */
export async function gravarNota(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  habilidadeId: string,
  valor: number,
): Promise<boolean> {
  const r = await sql<{ jogador_id: string }>`
    INSERT INTO notas (jogador_id, habilidade_id, grupo_id, valor)
    SELECT j.id, h.id, j.grupo_id, ${valor}
    FROM jogadores j JOIN habilidades h ON h.grupo_id = j.grupo_id
    WHERE j.id = ${jogadorId} AND h.id = ${habilidadeId} AND j.grupo_id = ${grupoId}
    ON CONFLICT (jogador_id, habilidade_id) DO UPDATE SET valor = EXCLUDED.valor
    RETURNING jogador_id
  `.execute(kyselyDe(ex));
  return r.rows.length > 0;
}

export async function apagarNota(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  habilidadeId: string,
): Promise<boolean> {
  const r = await kyselyDe(ex)
    .deleteFrom('notas')
    .where('grupo_id', '=', grupoId)
    .where('jogador_id', '=', jogadorId)
    .where('habilidade_id', '=', habilidadeId)
    .executeTakeFirst();
  return Number(r.numDeletedRows) > 0;
}
