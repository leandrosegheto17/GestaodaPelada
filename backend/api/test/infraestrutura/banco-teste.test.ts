import { describe, expect, it } from 'vitest';
import { executarSql } from '../apoio/sql.js';

describe('banco de teste preparado pelo setup global', () => {
  it('migracoes_aplicadas existe e tem registros', async () => {
    const linhas = await executarSql<{ n: string }>('SELECT count(*) AS n FROM migracoes_aplicadas');
    expect(Number(linhas[0]?.n)).toBeGreaterThan(0);
  });

  it('pgcrypto está disponível', async () => {
    await expect(executarSql('CREATE EXTENSION IF NOT EXISTS pgcrypto')).resolves.toBeDefined();
  });
});
