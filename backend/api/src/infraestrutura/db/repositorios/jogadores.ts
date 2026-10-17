import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

export class ApelidoEmUso extends Error {
  constructor() {
    super('Já existe um jogador com esse apelido neste grupo.');
  }
}
export class PeriodoInvalido extends Error {
  constructor() {
    super('A data de saída não pode ser anterior à de entrada.');
  }
}
export class JaAtivo extends Error {
  constructor() {
    super('O jogador já está ativo.');
  }
}
export class JogadorComHistorico extends Error {
  constructor() {
    super('O jogador tem histórico e não pode ser excluído.');
  }
}

export interface PeriodoDoJogador {
  inicio: string;
  fim: string | null;
}

export interface Jogador {
  id: string;
  apelido: string;
  anoNascimento: number | null;
  posicao: string | null;
  telefone: string | null;
  /** Em ordem de início. */
  periodos: PeriodoDoJogador[];
}

interface LinhaJogador {
  id: string;
  apelido: string;
  ano_nascimento: number | null;
  posicao: string | null;
  telefone: string | null;
  periodos: PeriodoDoJogador[];
}

const paraJogador = (l: LinhaJogador): Jogador => ({
  id: l.id,
  apelido: l.apelido,
  anoNascimento: l.ano_nascimento,
  posicao: l.posicao,
  telefone: l.telefone,
  periodos: l.periodos,
});

const codigoDe = (erro: unknown): { code?: string; constraint?: string } =>
  erro as { code?: string; constraint?: string };

async function consultar(ex: ExecutorDb, grupoId: string, jogadorId: string | null): Promise<Jogador[]> {
  const filtro = jogadorId === null ? sql`` : sql`AND j.id = ${jogadorId}`;
  const resultado = await sql<LinhaJogador>`
    SELECT j.id, j.apelido, j.ano_nascimento, j.posicao, j.telefone,
           coalesce(json_agg(json_build_object('inicio', p.inicio::text, 'fim', p.fim::text) ORDER BY p.inicio)
                    FILTER (WHERE p.id IS NOT NULL), '[]'::json) AS periodos
    FROM jogadores j
    LEFT JOIN periodos_ativos p ON p.jogador_id = j.id AND p.grupo_id = j.grupo_id
    WHERE j.grupo_id = ${grupoId} ${filtro}
    GROUP BY j.id
    ORDER BY lower(j.apelido), j.id
  `.execute(kyselyDe(ex));
  return resultado.rows.map(paraJogador);
}

export function listar(ex: ExecutorDb, grupoId: string): Promise<Jogador[]> {
  return consultar(ex, grupoId, null);
}

/** Jogador de outro grupo (ou inexistente) volta como `null`. */
export async function buscar(ex: ExecutorDb, grupoId: string, jogadorId: string): Promise<Jogador | null> {
  return (await consultar(ex, grupoId, jogadorId))[0] ?? null;
}

export interface DadosJogador {
  apelido: string;
  anoNascimento: number;
  posicao: string;
  telefone: string | null;
}

export async function criar(
  ex: ExecutorDb,
  grupoId: string,
  dados: DadosJogador & { dataEntrada: string; autor: string; agora: Date },
): Promise<string> {
  const banco = kyselyDe(ex);
  try {
    const linha = await banco
      .insertInto('jogadores')
      .values({
        grupo_id: grupoId,
        apelido: dados.apelido,
        ano_nascimento: dados.anoNascimento,
        posicao: dados.posicao,
        telefone: dados.telefone,
        criado_por: dados.autor,
        criado_em: dados.agora,
        alterado_por: dados.autor,
        alterado_em: dados.agora,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    await banco
      .insertInto('periodos_ativos')
      .values({ jogador_id: linha.id, grupo_id: grupoId, inicio: dados.dataEntrada, fim: null })
      .execute();
    return linha.id;
  } catch (erro) {
    if (codigoDe(erro).code === '23505' && codigoDe(erro).constraint === 'jogadores_apelido_grupo') {
      throw new ApelidoEmUso();
    }
    throw erro;
  }
}

/** Atualiza os dados; `dataEntrada` move o início do primeiro período. */
export async function editar(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  dados: DadosJogador & { dataEntrada?: string; autor: string; agora: Date },
): Promise<boolean> {
  const banco = kyselyDe(ex);
  try {
    const r = await banco
      .updateTable('jogadores')
      .set({
        apelido: dados.apelido,
        ano_nascimento: dados.anoNascimento,
        posicao: dados.posicao,
        telefone: dados.telefone,
        alterado_por: dados.autor,
        alterado_em: dados.agora,
      })
      .where('id', '=', jogadorId)
      .where('grupo_id', '=', grupoId)
      .executeTakeFirst();
    if (Number(r.numUpdatedRows) === 0) return false;
    if (dados.dataEntrada !== undefined) {
      await sql`
        UPDATE periodos_ativos SET inicio = ${dados.dataEntrada}
        WHERE id = (SELECT id FROM periodos_ativos
                    WHERE jogador_id = ${jogadorId} AND grupo_id = ${grupoId} ORDER BY inicio LIMIT 1)
      `.execute(banco);
    }
    return true;
  } catch (erro) {
    const { code, constraint } = codigoDe(erro);
    if (code === '23505' && constraint === 'jogadores_apelido_grupo') throw new ApelidoEmUso();
    if (code === '23514' && constraint === 'periodo_fim_depois_inicio') throw new PeriodoInvalido();
    throw erro;
  }
}

/** Fecha o período aberto na data de saída. */
export async function inativar(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  dataSaida: string,
): Promise<'ok' | 'sem_periodo_aberto'> {
  try {
    const r = await kyselyDe(ex)
      .updateTable('periodos_ativos')
      .set({ fim: dataSaida })
      .where('jogador_id', '=', jogadorId)
      .where('grupo_id', '=', grupoId)
      .where('fim', 'is', null)
      .executeTakeFirst();
    return Number(r.numUpdatedRows) > 0 ? 'ok' : 'sem_periodo_aberto';
  } catch (erro) {
    if (codigoDe(erro).constraint === 'periodo_fim_depois_inicio') throw new PeriodoInvalido();
    throw erro;
  }
}

/**
 * Abre um novo período. Devolve o id, ou `null` se o jogador não é do grupo ou a data cai antes
 * do fim do último período. Já ativo vira `JaAtivo` (índice do período aberto).
 */
export async function reativar(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  dataInicio: string,
): Promise<string | null> {
  try {
    const r = await sql<{ id: string }>`
      INSERT INTO periodos_ativos (jogador_id, grupo_id, inicio)
      SELECT j.id, j.grupo_id, ${dataInicio}::date FROM jogadores j
      WHERE j.id = ${jogadorId} AND j.grupo_id = ${grupoId}
        AND NOT EXISTS (SELECT 1 FROM periodos_ativos p
                        WHERE p.jogador_id = j.id AND p.fim IS NOT NULL AND p.fim > ${dataInicio}::date)
      RETURNING id
    `.execute(kyselyDe(ex));
    return r.rows[0]?.id ?? null;
  } catch (erro) {
    if (codigoDe(erro).constraint === 'periodos_um_aberto') throw new JaAtivo();
    throw erro;
  }
}

/** Apaga o jogador e os períodos dele; presença ou nota (chave estrangeira) vira `JogadorComHistorico`. */
export async function excluir(ex: ExecutorDb, grupoId: string, jogadorId: string): Promise<boolean> {
  const banco = kyselyDe(ex);
  try {
    await banco
      .deleteFrom('periodos_ativos')
      .where('jogador_id', '=', jogadorId)
      .where('grupo_id', '=', grupoId)
      .execute();
    const r = await banco
      .deleteFrom('jogadores')
      .where('id', '=', jogadorId)
      .where('grupo_id', '=', grupoId)
      .executeTakeFirst();
    return Number(r.numDeletedRows) > 0;
  } catch (erro) {
    if (codigoDe(erro).code === '23503') throw new JogadorComHistorico();
    throw erro;
  }
}

/** Há presença, nota ou pagamento registrado para o jogador? */
export async function temHistorico(ex: ExecutorDb, grupoId: string, jogadorId: string): Promise<boolean> {
  const r = await sql<{ existe: boolean }>`
    SELECT EXISTS (SELECT 1 FROM presencas WHERE grupo_id = ${grupoId} AND jogador_id = ${jogadorId})
        OR EXISTS (SELECT 1 FROM notas WHERE grupo_id = ${grupoId} AND jogador_id = ${jogadorId})
        OR EXISTS (SELECT 1 FROM pagamentos_mes WHERE grupo_id = ${grupoId} AND jogador_id = ${jogadorId}) AS existe
  `.execute(kyselyDe(ex));
  return r.rows[0]?.existe ?? false;
}

/** Há presença anterior à data (usado ao mover a data de entrada)? */
export async function temPresencaAntesDe(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  data: string,
): Promise<boolean> {
  const r = await sql<{ existe: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM presencas pr JOIN partidas pa ON pa.id = pr.partida_id AND pa.grupo_id = pr.grupo_id
      WHERE pr.grupo_id = ${grupoId} AND pr.jogador_id = ${jogadorId} AND pa.data < ${data}::date
    ) AS existe
  `.execute(kyselyDe(ex));
  return r.rows[0]?.existe ?? false;
}
