import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

export type FormatoEscalacao = 'dois_times' | 'varios_times';

export interface EscalacaoGravar {
  data: string;
  formato: FormatoEscalacao;
  n: number;
  /** `null` = ilimitado (dois times) ou sem K (3 ou mais times). */
  k: number | null;
  /** JSON validado pela aplicação; o repositório não o interpreta. */
  composicao: unknown;
  confirmadaPor: string;
  confirmadaEm: Date;
}

export interface EscalacaoLida extends EscalacaoGravar {
  id: string;
}

interface LinhaEscalacao {
  id: string;
  data: string;
  formato: FormatoEscalacao;
  n: number;
  k: number | null;
  composicao: unknown;
  confirmada_por: string;
  confirmada_em: Date;
}

/** Grava a escalação da data; confirmar de novo na mesma data substitui a anterior. */
export async function confirmar(
  ex: ExecutorDb,
  grupoId: string,
  e: EscalacaoGravar,
): Promise<{ data: string; confirmadaEm: Date }> {
  const r = await sql<{ data: string; confirmada_em: Date }>`
    INSERT INTO escalacoes (grupo_id, data, formato, n, k, composicao, confirmada_por, confirmada_em)
    VALUES (${grupoId}, ${e.data}::date, ${e.formato}, ${e.n}, ${e.k}, ${JSON.stringify(e.composicao)}::jsonb,
            ${e.confirmadaPor}, ${e.confirmadaEm})
    ON CONFLICT ON CONSTRAINT escalacoes_grupo_data DO UPDATE SET
      formato = EXCLUDED.formato, n = EXCLUDED.n, k = EXCLUDED.k, composicao = EXCLUDED.composicao,
      confirmada_por = EXCLUDED.confirmada_por, confirmada_em = EXCLUDED.confirmada_em
    RETURNING data::text AS data, confirmada_em
  `.execute(kyselyDe(ex));
  const linha = r.rows[0];
  if (!linha) throw new Error('Escalação não gravada.');
  return { data: linha.data, confirmadaEm: linha.confirmada_em };
}

/** A escalação confirmada da data, ou `null`. */
export async function porData(ex: ExecutorDb, grupoId: string, data: string): Promise<EscalacaoLida | null> {
  const r = await sql<LinhaEscalacao>`
    SELECT id, data::text AS data, formato, n, k, composicao, confirmada_por, confirmada_em
    FROM escalacoes
    WHERE grupo_id = ${grupoId} AND data = ${data}::date
  `.execute(kyselyDe(ex));
  const l = r.rows[0];
  if (!l) return null;
  return {
    id: l.id,
    data: l.data,
    formato: l.formato,
    n: l.n,
    k: l.k,
    composicao: l.composicao,
    confirmadaPor: l.confirmada_por,
    confirmadaEm: l.confirmada_em,
  };
}
