import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracoes } from '../../../api/src/infraestrutura/db/migracoes/aplicar.js';
import { lerMigracoes } from '../../../api/src/infraestrutura/db/migracoes/ler.js';
import {
  EMAIL_DONO,
  EMAIL_MARQUINHOS,
  EMAIL_PAULO,
  EMAIL_RODRIGO,
  SENHA_DE_TESTE,
  SENHA_TEMPORARIA_DE_TESTE,
  SLUG_QUINTA,
} from '../../seed-local/ids.ts';

const RAIZ = resolve(import.meta.dirname, '../../../..');
const requireApi = createRequire(join(RAIZ, 'backend/api/package.json'));
interface Cliente {
  connect(): Promise<void>;
  end(): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(texto: string, params?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}
const pg = requireApi('pg') as { Client: new (opcoes: { connectionString: string }) => Cliente };

const BASE = process.env['DATABASE_URL_TESTE'] ?? 'postgres://postgres:postgres@localhost:55432/pelada_teste';
const NOME = 'pelada_exec_tp0051';
const urlDe = (nome: string): string => {
  const u = new URL(BASE);
  u.pathname = `/${nome}`;
  return u.toString();
};
const URL_SEED = urlDe(NOME);

function semear(url: string | undefined, ...args: string[]) {
  return semearComEnv(url, {}, ...args);
}

function semearComEnv(url: string | undefined, extra: NodeJS.ProcessEnv, ...args: string[]) {
  const env: NodeJS.ProcessEnv = { ...process.env, CI: 'true', ...extra };
  delete env['DATABASE_URL'];
  if (url) env['DATABASE_URL'] = url;
  return spawnSync(process.execPath, ['--import', 'tsx', join(RAIZ, 'backend/scripts/seed-local.ts'), ...args], {
    encoding: 'utf8',
    env,
    cwd: RAIZ,
  });
}

let cliente: Cliente;
const contar = async (consulta: string, params: unknown[] = []): Promise<number> =>
  Number((await cliente.query(consulta, params)).rows[0].n);

async function fotografia() {
  return {
    contas: await contar(`SELECT count(*) n FROM contas WHERE email LIKE '%exemplo.com.br' OR email = $1`, [
      EMAIL_DONO,
    ]),
    grupos: await contar(`SELECT count(*) n FROM grupos WHERE slug IN ('pelada-de-quinta','racha-de-domingo')`),
    jogadores: await contar(`SELECT count(*) n FROM jogadores`),
    notas: await contar(`SELECT count(*) n FROM notas`),
    partidas: await contar(`SELECT count(*) n FROM partidas`),
    presencas: await contar(`SELECT count(*) n FROM presencas`),
  };
}

beforeAll(async () => {
  const admin = new pg.Client({ connectionString: urlDe('postgres') });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${NOME}`);
  await admin.query(`CREATE DATABASE ${NOME}`);
  await admin.end();
  await aplicarMigracoes(URL_SEED, lerMigracoes(join(RAIZ, 'backend/api/src/infraestrutura/db/migracoes')));
  cliente = new pg.Client({ connectionString: URL_SEED });
  await cliente.connect();
}, 60_000);

afterAll(async () => {
  await cliente?.end();
  const admin = new pg.Client({ connectionString: urlDe('postgres') });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${NOME} WITH (FORCE)`);
  await admin.end();
}, 60_000);

describe('trava do seed local', () => {
  const remotos = [
    'postgres://u:senha-secreta@LOCALHOST.algo.com/db',
    'postgres://u:senha-secreta@ep-x.neon.tech/db',
    'postgres://u:senha-secreta@localhost/db?host=remoto.com',
    undefined,
  ];
  it.each(remotos)('recusa %s mesmo com --alvo e CI=true, sem vazar a senha', { timeout: 90_000 }, (url) => {
    for (const args of [[], ['--alvo', 'producao'], ['--alvo', 'teste']]) {
      const r = semear(url, ...args);
      expect(r.status).toBe(1);
      expect(r.stdout + r.stderr).not.toContain('senha-secreta');
    }
  });

  const locais = ['localhost', '127.0.0.1', '[::1]', 'db'];
  it.each(locais)('deixa passar o host local %s (falha só ao conectar)', { timeout: 90_000 }, (host) => {
    const r = semear(`postgres://u:senha-secreta@${host}:1/db`);
    expect(r.status).toBe(1);
    const saida = r.stdout + r.stderr;
    expect(saida).toContain('Falha ao semear o banco local.');
    expect(saida).not.toContain('Host remoto');
    expect(saida).not.toContain('senha-secreta');
  });
});

describe('seed local', () => {
  it('cria os dados, é idempotente e preserva o que não é do seed', async () => {
    const conta = await cliente.query(
      `INSERT INTO contas (email, nome, senha_hash, criada_em) VALUES ('fora@teste.invalido', 'Fora', 'x', now()) RETURNING id`,
    );
    await cliente.query(
      `INSERT INTO grupos (nome, slug, dia_semana, frequencia, horario, criado_por, criado_em)
       VALUES ('Fora do seed', 'fora-do-seed-tp0051', 'sexta', 'semanal', '19:00', $1, now())`,
      [conta.rows[0].id],
    );
    const primeira = semear(URL_SEED);
    expect(primeira.status, primeira.stderr).toBe(0);
    expect(primeira.stdout + primeira.stderr).not.toContain('postgres://');
    const antes = await fotografia();

    expect(antes.contas).toBe(5);
    expect(antes.grupos).toBe(2);
    expect(antes.jogadores).toBeGreaterThanOrEqual(20);
    expect(antes.notas).toBeGreaterThan(0);
    const meses = await cliente.query(`SELECT count(DISTINCT to_char(data, 'YYYY-MM')) n FROM partidas`);
    expect(Number(meses.rows[0].n)).toBeGreaterThanOrEqual(3);
    expect(antes.presencas).toBeGreaterThan(0);

    const segunda = semear(URL_SEED);
    expect(segunda.status, segunda.stderr).toBe(0);
    expect(await fotografia()).toEqual(antes);
    expect(await contar(`SELECT count(*) n FROM grupos WHERE slug = 'fora-do-seed-tp0051'`)).toBe(1);
    await cliente.query(`DELETE FROM grupos WHERE slug = 'fora-do-seed-tp0051'`);
    await cliente.query(`DELETE FROM contas WHERE email = 'fora@teste.invalido'`);
  }, 120_000);

  it('falha no meio da transação desfaz tudo e mantém o seed anterior', async () => {
    expect(semear(URL_SEED).status).toBe(0);
    const antes = await fotografia();
    const r = semearComEnv(URL_SEED, { PELADA_SEED_FALHA_FORCADA: '1' });
    expect(r.status).toBe(1);
    expect(await fotografia()).toEqual(antes);
  }, 120_000);

  it('contas, senhas, financeiro e notas conforme o README', async () => {
    const senha = async (email: string, s: string) =>
      (
        await cliente.query(
          `SELECT (senha_hash = crypt($2, senha_hash)) ok, senha_temporaria t FROM contas WHERE email=$1`,
          [email, s],
        )
      ).rows[0];
    expect((await senha(EMAIL_DONO, SENHA_DE_TESTE)).ok).toBe(true);
    expect((await senha(EMAIL_PAULO, SENHA_DE_TESTE)).ok).toBe(true);
    const rodrigo = await senha(EMAIL_RODRIGO, SENHA_TEMPORARIA_DE_TESTE);
    expect(rodrigo.ok).toBe(true);
    expect(rodrigo.t).toBe(true);
    const marq = await cliente.query(
      `SELECT v.acessa_financeiro f FROM vinculos_admin v JOIN contas c ON c.id=v.conta_id
       JOIN grupos g ON g.id=v.grupo_id WHERE c.email=$1 AND g.slug=$2`,
      [EMAIL_MARQUINHOS, SLUG_QUINTA],
    );
    expect(marq.rows[0].f).toBe(false);
    const notas = async (apelido: string) =>
      contar(
        `SELECT count(*) n FROM notas n JOIN jogadores j ON j.id=n.jogador_id JOIN grupos g ON g.id=j.grupo_id
         WHERE j.apelido=$1 AND g.slug=$2`,
        [apelido, SLUG_QUINTA],
      );
    expect(await notas('Toninho')).toBe(6);
    expect(await notas('Léo Baiano')).toBe(0);
  });
});
