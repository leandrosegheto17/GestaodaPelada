import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import pg from 'pg';
import { afterEach } from 'vitest';
import { aplicarMigracoes } from '../../src/infraestrutura/db/migracoes/aplicar.js';
import { lerMigracoes } from '../../src/infraestrutura/db/migracoes/ler.js';
import { exigirHostPermitido } from '../../src/infraestrutura/seguranca/trava-host.js';
import { URL_BANCO_TESTE } from './url-teste.js';

export const PASTA_MIGRACOES = join(import.meta.dirname, '../../src/infraestrutura/db/migracoes');

function urlDe(banco: string): string {
  const url = new URL(URL_BANCO_TESTE);
  url.pathname = `/${banco}`;
  return url.toString();
}

/**
 * Registra a limpeza dos bancos descartáveis criados por `bancoAntesDaMigracao` e devolve a função
 * que cria um banco com todas as migrações menos `nova`, para provar a conversão de dados existentes.
 */
export function bancosDescartaveis(nova: string): () => Promise<{ cliente: pg.Client; url: string }> {
  const criados: string[] = [];

  afterEach(async () => {
    const admin = new pg.Client({ connectionString: urlDe('postgres') });
    await admin.connect();
    try {
      for (const banco of criados.splice(0)) await admin.query(`DROP DATABASE IF EXISTS ${banco} WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  });

  return async () => {
    await exigirHostPermitido({ url: URL_BANCO_TESTE });
    const nome = `pelada_mig_${randomBytes(6).toString('hex')}`;
    const admin = new pg.Client({ connectionString: urlDe('postgres') });
    await admin.connect();
    try {
      await admin.query(`CREATE DATABASE ${nome}`);
    } finally {
      await admin.end();
    }
    criados.push(nome);
    const url = urlDe(nome);
    await aplicarMigracoes(
      url,
      lerMigracoes(PASTA_MIGRACOES).filter((m) => m.nome !== nova),
    );
    const cliente = new pg.Client({ connectionString: url });
    await cliente.connect();
    return { cliente, url };
  };
}
