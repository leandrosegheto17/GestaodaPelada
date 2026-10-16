import pg from 'pg';

export interface Migracao {
  /** `AAAAMMDDHHMM_descricao.sql` */
  nome: string;
  sql: string;
}

export interface ResultadoMigracoes {
  aplicadas: string[];
  puladas: string[];
}

export const PADRAO_NOME_MIGRACAO = /^\d{12}_[a-z0-9_]+\.sql$/;

export class MigracaoFalhou extends Error {
  constructor(
    readonly nome: string,
    causa: unknown,
  ) {
    super(`Falha na migração ${nome}: ${causa instanceof Error ? causa.message : 'erro'}`);
  }
}

/**
 * Aplica as migrações pendentes em ordem de nome, uma transação por migração.
 * Para na primeira que falhar, sem aplicar as seguintes.
 */
export async function aplicarMigracoes(
  connectionString: string,
  migracoes: readonly Migracao[],
): Promise<ResultadoMigracoes> {
  const invalida = migracoes.find((m) => !PADRAO_NOME_MIGRACAO.test(m.nome));
  if (invalida) throw new Error(`Nome de migração inválido: ${invalida.nome}`);

  const ordenadas = [...migracoes].sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0));
  const cliente = new pg.Client({ connectionString });
  await cliente.connect();
  const resultado: ResultadoMigracoes = { aplicadas: [], puladas: [] };
  try {
    await cliente.query(
      `CREATE TABLE IF NOT EXISTS migracoes_aplicadas (
         nome text PRIMARY KEY,
         aplicada_em timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const feitas = await cliente.query<{ nome: string }>('SELECT nome FROM migracoes_aplicadas');
    const jaAplicadas = new Set(feitas.rows.map((linha) => linha.nome));

    for (const migracao of ordenadas) {
      if (jaAplicadas.has(migracao.nome)) {
        resultado.puladas.push(migracao.nome);
        continue;
      }
      try {
        await cliente.query('BEGIN');
        await cliente.query(migracao.sql);
        await cliente.query('INSERT INTO migracoes_aplicadas (nome) VALUES ($1)', [migracao.nome]);
        await cliente.query('COMMIT');
        resultado.aplicadas.push(migracao.nome);
      } catch (erro) {
        await cliente.query('ROLLBACK').catch(() => undefined);
        throw new MigracaoFalhou(migracao.nome, erro);
      }
    }
    return resultado;
  } finally {
    await cliente.end();
  }
}
