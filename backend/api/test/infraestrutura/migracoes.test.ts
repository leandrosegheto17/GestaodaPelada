import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aplicarMigracoes, MigracaoFalhou, type Migracao } from '../../src/infraestrutura/db/migracoes/aplicar.js';
import { criarBancoTemporario, temBanco, type BancoTemporario } from '../apoio/banco.js';

const FIXTURE = join(import.meta.dirname, '../apoio/migracoes-fixture');
const ler = (pasta: string, nome: string): Migracao => ({
  nome,
  sql: readFileSync(join(FIXTURE, pasta, nome), 'utf8'),
});

async function consultar<T extends pg.QueryResultRow>(url: string, sql: string): Promise<T[]> {
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    return (await cliente.query<T>(sql)).rows;
  } finally {
    await cliente.end();
  }
}

describe.skipIf(!temBanco)('migrações contra o Postgres de teste', () => {
  let banco: BancoTemporario;
  const ok = [ler('ok', '202610010000_primeira.sql'), ler('ok', '202610020000_segunda.sql')];

  beforeAll(async () => {
    banco = await criarBancoTemporario();
  });
  afterAll(async () => {
    await banco?.remover();
  });

  it('aplica do zero, em ordem, e registra', async () => {
    const r = await aplicarMigracoes(banco.url, [...ok].reverse());
    expect(r.aplicadas).toEqual(ok.map((m) => m.nome));
    const linhas = await consultar<{ nome: string }>(banco.url, 'SELECT nome FROM migracoes_aplicadas ORDER BY nome');
    expect(linhas).toHaveLength(2);
  });

  it('reaplicar não tem efeito', async () => {
    const r = await aplicarMigracoes(banco.url, ok);
    expect(r.aplicadas).toEqual([]);
    expect(r.puladas).toHaveLength(2);
  });

  it('arquivo com carimbo menor criado depois roda primeiro entre os pendentes', async () => {
    const extra: Migracao[] = [
      { nome: '202610050000_c.sql', sql: 'CREATE TABLE ordem_c (id int);' },
      { nome: '202610040000_b.sql', sql: 'CREATE TABLE ordem_b (id int);' },
    ];
    const r = await aplicarMigracoes(banco.url, [...ok, ...extra]);
    expect(r.aplicadas).toEqual(['202610040000_b.sql', '202610050000_c.sql']);
  });

  it('erro na segunda: a primeira fica, a segunda não deixa rastro e a terceira não roda', async () => {
    const com = [
      { nome: '202611010000_boa.sql', sql: 'CREATE TABLE antes_do_erro (id int);' },
      ler('com-erro', '202611020000_erro.sql'),
      { nome: '202611030000_depois.sql', sql: 'CREATE TABLE depois_do_erro (id int);' },
    ];
    await expect(aplicarMigracoes(banco.url, com)).rejects.toBeInstanceOf(MigracaoFalhou);
    const tabelas = await consultar<{ table_name: string }>(
      banco.url,
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const nomes = tabelas.map((t) => t.table_name);
    expect(nomes).toContain('antes_do_erro');
    expect(nomes).not.toContain('parcial');
    expect(nomes).not.toContain('depois_do_erro');
  });

  it('nome inválido não aplica nada', async () => {
    await expect(
      aplicarMigracoes(banco.url, [{ nome: 'sem-carimbo.sql', sql: 'CREATE TABLE nao_deve_existir (id int);' }]),
    ).rejects.toThrow();
    const tabelas = await consultar<{ table_name: string }>(
      banco.url,
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'nao_deve_existir'",
    );
    expect(tabelas).toHaveLength(0);
  });
});
