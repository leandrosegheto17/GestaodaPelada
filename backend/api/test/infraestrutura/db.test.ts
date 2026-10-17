import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import * as publico from '../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import { criarDb, emTransacao, fecharDb } from '../../src/infraestrutura/db/index.js';
import type { Db, Tx } from '../../src/infraestrutura/db/index.js';
import { criarBancoTemporario, temBanco, type BancoTemporario } from '../apoio/banco.js';

function contextoFalso() {
  const promessas: Promise<unknown>[] = [];
  return { waitUntil: (p: Promise<unknown>) => void promessas.push(p), promessas };
}

describe('módulo de dados: superfície pública', () => {
  it('não exporta Kysely, pg, Client nem sql', () => {
    const nomes = Object.keys(publico);
    for (const proibido of ['Kysely', 'pg', 'Client', 'sql', 'kyselyDe', 'embrulhar']) {
      expect(nomes).not.toContain(proibido);
    }
    expect(nomes.sort()).toEqual(['criarDb', 'emTransacao', 'fecharDb']);
  });

  it('Db e Tx não expõem Kysely nem pg no tipo público', () => {
    expectTypeOf<Db>().not.toHaveProperty('kysely');
    expectTypeOf<Db>().not.toHaveProperty('query');
    expectTypeOf<Db>().not.toHaveProperty('connect');
    expectTypeOf<Tx>().not.toHaveProperty('kysely');
    expectTypeOf<Tx>().not.toHaveProperty('query');
    expectTypeOf<Tx>().not.toHaveProperty('connect');
    const db = {} as Db;
    const tx = {} as Tx;
    // @ts-expect-error o tipo público não tem consulta direta
    void db.query;
    // @ts-expect-error o tipo público não tem consulta direta
    void tx.connect;
  });
});

describe.skipIf(!temBanco)('módulo de dados contra o Postgres de teste', () => {
  let banco: BancoTemporario;
  const tabela = `t_${randomBytes(4).toString('hex')}`;

  async function externo<T extends pg.QueryResultRow>(sql: string): Promise<T[]> {
    const c = new pg.Client({ connectionString: banco.url });
    await c.connect();
    try {
      return (await c.query<T>(sql)).rows;
    } finally {
      await c.end();
    }
  }

  const abrir = () => {
    const ctx = contextoFalso();
    return { db: criarDb({ connectionString: banco.url }, ctx), ctx };
  };
  const sql = async (db: ReturnType<typeof criarDb>, texto: string) => {
    const { sql: bruto } = await import('kysely');
    return bruto.raw(texto).execute(kyselyDe(db));
  };

  beforeAll(async () => {
    banco = await criarBancoTemporario();
    await externo(`CREATE TABLE ${tabela} (id int PRIMARY KEY)`);
  });
  afterAll(async () => {
    await banco?.remover();
  });

  it('commit: a escrita fica visível para outro cliente e o valor volta', async () => {
    const { db } = abrir();
    const valor = await emTransacao(db, async (tx) => {
      await sql(tx as never, `INSERT INTO ${tabela} VALUES (1)`);
      return 'pronto';
    });
    await fecharDb(db);
    expect(valor).toBe('pronto');
    expect(await externo(`SELECT id FROM ${tabela}`)).toEqual([{ id: 1 }]);
  });

  it('rollback: exceção desfaz tudo e é relançada', async () => {
    const { db } = abrir();
    await expect(
      emTransacao(db, async (tx) => {
        await sql(tx as never, `INSERT INTO ${tabela} VALUES (2)`);
        throw new Error('falhou');
      }),
    ).rejects.toThrow('falhou');
    await fecharDb(db);
    expect(await externo(`SELECT id FROM ${tabela} WHERE id = 2`)).toEqual([]);
  });

  it('usa a mesma conexão dentro e fora da transação', async () => {
    const { db } = abrir();
    const antes = await sql(db, 'SELECT pg_backend_pid() AS pid');
    const dentro = await emTransacao(db, async (tx) => {
      const a = await sql(tx as never, 'SELECT pg_backend_pid() AS pid');
      const b = await sql(tx as never, 'SELECT pg_backend_pid() AS pid');
      return [a.rows, b.rows];
    });
    const depois = await sql(db, 'SELECT pg_backend_pid() AS pid');
    await fecharDb(db);
    expect(dentro[0]).toEqual(dentro[1]);
    expect(antes.rows).toEqual(dentro[0]);
    expect(depois.rows).toEqual(dentro[0]);
  });

  it('transação aninhada é recusada', async () => {
    const { db } = abrir();
    await expect(emTransacao(db, (tx) => emTransacao(tx as never, async () => 1))).rejects.toThrow(
      /aninhad|dentro de uma transação/,
    );
    await fecharDb(db);
  });

  it('a conexão é liberada: 20 ciclos não acumulam e o waitUntil termina', async () => {
    for (let i = 0; i < 20; i++) {
      const { db, ctx } = abrir();
      await sql(db, 'SELECT 1');
      await fecharDb(db);
      await Promise.all(ctx.promessas);
    }
    const ativas = await externo<{ n: string }>(
      `SELECT count(*) AS n FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()`,
    );
    expect(Number(ativas[0]?.n)).toBe(0);
  });

  it('fechar sem nunca ter consultado não abre conexão e é idempotente', async () => {
    const { db, ctx } = abrir();
    await fecharDb(db);
    await fecharDb(db);
    await Promise.all(ctx.promessas);
  });
});
