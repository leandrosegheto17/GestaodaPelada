import pg from 'pg';
import { exigirHostPermitido } from '../../src/infraestrutura/seguranca/trava-host.js';
import { URL_BANCO_TESTE } from './url-teste.js';

/** Executa SQL no banco de teste (passa pela trava de host). Só para testes de migração e de apoio. */
export async function executarSql<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  parametros: unknown[] = [],
): Promise<T[]> {
  await exigirHostPermitido({ url: URL_BANCO_TESTE });
  const cliente = new pg.Client({ connectionString: URL_BANCO_TESTE });
  await cliente.connect();
  try {
    return (await cliente.query<T>(sql, parametros)).rows;
  } finally {
    await cliente.end();
  }
}

/** Código SQLSTATE do erro que a consulta lança; `null` se não lançar. */
export async function codigoDoErro(promessa: Promise<unknown>): Promise<string | null> {
  try {
    await promessa;
    return null;
  } catch (erro) {
    return (erro as { code?: string }).code ?? 'sem-codigo';
  }
}
