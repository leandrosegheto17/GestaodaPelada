import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { aplicarMigracoes } from '../../src/infraestrutura/db/migracoes/aplicar.js';
import { lerMigracoes } from '../../src/infraestrutura/db/migracoes/ler.js';
import { exigirHostPermitido } from '../../src/infraestrutura/seguranca/trava-host.js';

const PADRAO = 'postgres://postgres:postgres@localhost:5432/pelada_teste';
const PASTA_MIGRACOES = join(import.meta.dirname, '../../src/infraestrutura/db/migracoes');

function urlAdmin(url: string): string {
  const admin = new URL(url);
  admin.pathname = '/postgres';
  return admin.toString();
}

/** Cria o banco de teste se faltar e aplica todas as migrações antes da suíte. */
export default async function preparar(): Promise<void> {
  const url = process.env['DATABASE_URL_TESTE'] ?? PADRAO;
  await exigirHostPermitido({ url });

  // O Worker de teste declara `assets`; a pasta precisa existir mesmo sem build do app.
  mkdirSync(join(import.meta.dirname, '../../../../frontend/web/dist'), { recursive: true });

  const nome = new URL(url).pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(nome)) throw new Error('Nome do banco de teste inválido.');
  const admin = new pg.Client({ connectionString: urlAdmin(url) });
  try {
    await admin.connect();
  } catch {
    throw new Error('Não foi possível conectar ao Postgres de teste: suba o banco (docker compose up db).');
  }
  try {
    const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nome]);
    if (existe.rowCount === 0) await admin.query(`CREATE DATABASE ${nome}`);
  } finally {
    await admin.end();
  }
  await aplicarMigracoes(url, lerMigracoes(PASTA_MIGRACOES));
}
