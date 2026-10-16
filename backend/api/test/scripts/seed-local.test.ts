import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracoes } from '../../src/infraestrutura/db/migracoes/aplicar.js';
import { lerMigracoes } from '../../src/infraestrutura/db/migracoes/ler.js';
import { criarBancoTemporario, temBanco, type BancoTemporario } from '../apoio/banco.js';

const RAIZ = join(import.meta.dirname, '../../../..');
const MIGRACOES = join(import.meta.dirname, '../../src/infraestrutura/db/migracoes');

function seed(url: string) {
  const r = spawnSync('pnpm', ['exec', 'tsx', 'backend/scripts/seed-local.ts'], {
    cwd: RAIZ,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, DATABASE_URL: url },
  });
  return { codigo: r.status, saida: r.stdout, erro: r.stderr };
}

async function contagens(url: string): Promise<Record<string, number>> {
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    const resultado: Record<string, number> = {};
    for (const tabela of [
      'contas',
      'grupos',
      'jogadores',
      'notas',
      'partidas',
      'presencas',
      'config_pesos',
      'habilidades',
    ]) {
      const r = await cliente.query<{ n: string }>(`SELECT count(*) AS n FROM ${tabela}`);
      resultado[tabela] = Number(r.rows[0]?.n);
    }
    return resultado;
  } finally {
    await cliente.end();
  }
}

describe.skipIf(!temBanco)('seed local', () => {
  let banco: BancoTemporario;
  beforeAll(async () => {
    banco = await criarBancoTemporario();
    await aplicarMigracoes(banco.url, lerMigracoes(MIGRACOES));
  });
  afterAll(async () => {
    await banco?.remover();
  });

  it('roda duas vezes com as mesmas contagens e os requisitos do aceite', async () => {
    const primeira = seed(banco.url);
    expect(primeira.codigo, primeira.erro).toBe(0);
    const depoisDaPrimeira = await contagens(banco.url);
    const segunda = seed(banco.url);
    expect(segunda.codigo, segunda.erro).toBe(0);
    expect(await contagens(banco.url)).toEqual(depoisDaPrimeira);
    expect(depoisDaPrimeira['contas']).toBe(5);
    expect(depoisDaPrimeira['grupos']).toBe(2);
    expect(depoisDaPrimeira['jogadores']).toBeGreaterThanOrEqual(20);
    expect(depoisDaPrimeira['partidas']).toBeGreaterThanOrEqual(13);
    expect(depoisDaPrimeira['habilidades']).toBe(12);
    expect(primeira.saida).not.toContain(banco.url);
  });

  it('não toca dados fora do seed', async () => {
    const cliente = new pg.Client({ connectionString: banco.url });
    await cliente.connect();
    try {
      await cliente.query(
        "INSERT INTO contas (email, nome, senha_hash, criada_em) VALUES ('fora-do-seed@teste.invalid', 'Fora', 'x', now())",
      );
      expect(seed(banco.url).codigo).toBe(0);
      const r = await cliente.query("SELECT 1 FROM contas WHERE email = 'fora-do-seed@teste.invalid'");
      expect(r.rowCount).toBe(1);
      await cliente.query("DELETE FROM contas WHERE email = 'fora-do-seed@teste.invalid'");
    } finally {
      await cliente.end();
    }
  });

  it('recusa host remoto, mesmo com --alvo, e não mostra a senha', () => {
    const r = spawnSync('pnpm', ['exec', 'tsx', 'backend/scripts/seed-local.ts', '--alvo', 'producao'], {
      cwd: RAIZ,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      env: { ...process.env, DATABASE_URL: 'postgres://u:segredo@ep-x.aws.neon.tech/x', CI: 'true' },
    });
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).not.toContain('segredo');
  });
});
