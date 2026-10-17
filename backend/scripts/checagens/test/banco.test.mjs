import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const PASTA = resolve(import.meta.dirname, '..');
const temporarias = [];

function criar(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'banco-'));
  temporarias.push(raiz);
  for (const [nome, texto] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, nome)), { recursive: true });
    writeFileSync(join(raiz, nome), texto);
  }
  return raiz;
}

const rodar = (script, ...args) => spawnSync(process.execPath, [join(PASTA, script), ...args], { encoding: 'utf8' });

afterEach(() => {
  while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true });
});

describe('checar-migracao-aditiva', () => {
  const status = (sql) => rodar('checar-migracao-aditiva.mjs', criar({ '202610010000_x.sql': sql })).status;

  it.each([
    'CREATE TABLE t (id integer, valor bigint);',
    'ALTER TABLE t ADD COLUMN nota integer;',
    '-- drop table x\nCREATE TABLE t (id int);',
    '/* DROP TABLE x */ CREATE TABLE t (id int);',
    "INSERT INTO t VALUES ('DROP TABLE x');",
    'CREATE FUNCTION f() RETURNS void AS $$ BEGIN DROP TABLE x; END $$ LANGUAGE plpgsql;',
    'CREATE TABLE t ("drop" int);',
    '-- contrair: remover coluna antiga depois do deploy\nALTER TABLE t DROP COLUMN velha;',
    'ALTER TABLE t ADD COLUMN c integer NOT NULL DEFAULT 0;',
    'ALTER TABLE t ALTER COLUMN c SET DEFAULT 0; ALTER TABLE t ALTER COLUMN c SET NOT NULL;',
    '/* a /* aninhado */ ainda comentário */ CREATE TABLE t (id int);',
  ])('passa: %s', (sql) => {
    expect(status(sql)).toBe(0);
  });

  it.each([
    'DROP TABLE t;',
    'drop   \n table t;',
    'DrOp TABLE t;',
    'ALTER TABLE t RENAME TO u;',
    'ALTER TABLE t RENAME COLUMN a TO b;',
    'ALTER TABLE t ALTER COLUMN c TYPE bigint;',
    'ALTER TABLE t ALTER COLUMN c SET DATA TYPE bigint;',
    'ALTER TABLE t ALTER COLUMN c SET NOT NULL;',
    'ALTER TABLE t ADD COLUMN c integer NOT NULL;',
    'CREATE TABLE t (v money);',
    'CREATE TABLE t (v REAL);',
    'CREATE TABLE t (v double\nprecision);',
    'CREATE TABLE t (v float8);',
    'CREATE TABLE t (v numeric(10,2));',
    '-- contrair:\nDROP TABLE t;',
    '/* um /* dois */ DROP TABLE t;',
    '',
    '-- só comentário',
  ])('falha: %j', (sql) => {
    expect(status(sql)).toBe(1);
  });

  it('pasta inexistente falha fechado e pasta vazia passa', () => {
    expect(rodar('checar-migracao-aditiva.mjs', join(tmpdir(), 'nao-existe-xyz')).status).toBe(2);
    expect(rodar('checar-migracao-aditiva.mjs', criar({ 'LEIA.txt': 'x' })).status).toBe(0);
  });

  it('aponta o arquivo e a linha', () => {
    const r = rodar('checar-migracao-aditiva.mjs', criar({ '202610010000_x.sql': 'SELECT 1;\n\nDROP TABLE t;' }));
    expect(r.stderr).toContain('202610010000_x.sql:3');
  });
});

describe('checar-grupo-id', () => {
  const rodarRepo = (arquivos, excecoes = []) => {
    const raiz = criar({ ...arquivos, 'excecoes.json': JSON.stringify(excecoes) });
    return rodar('checar-grupo-id.mjs', raiz, join(raiz, 'excecoes.json'));
  };
  const repo = (corpo) => ({ 'partidas.ts': `type Db = object; type Tx = object;\n${corpo}` });

  it.each([
    'export async function listar(ex: Db, grupoId: string, mes: string) { return [ex, grupoId, mes]; }',
    'export const criar = async (ex: Tx, grupoId: string) => [ex, grupoId];',
    'export function sem(grupoId: string) { return grupoId; }',
    'const interna = (x: string) => x; export const constante = 1; export type T = string;',
  ])('passa: %s', (corpo) => {
    expect(rodarRepo(repo(corpo)).status).toBe(0);
  });

  it.each([
    'export function f(ex: Db, mes: string, grupoId: string) { return [ex, mes, grupoId]; }',
    'export function f() { return 1; }',
    'export function f({ grupoId }: { grupoId: string }) { return grupoId; }',
    'export function f(...args: string[]) { return args; }',
    'export const f = (id: string, grupoId: string) => [id, grupoId];',
    'export function f(grupo_id: string) { return grupo_id; }',
    'function g(x: string) { return x; } export { g as h };',
    'export default function (x: string) { return x; }',
    'const envolver = (f: unknown) => f; export const f = envolver((id: string) => id);',
    'export const f = (envolver as any)((id: string) => id);',
    'export const o = { listar(id: string) { return id; } };',
    'export const o = { listar: (id: string) => id };',
    'const m = { a: 1 }; export const o = { ...m };',
    'export class R { listar(id: string) { return id; } }',
    'export const C = class { listar(id: string) { return id; } };',
    'export default { listar(id: string) { return id; } };',
    'export default (globalThis as any).envolver((id: string) => id);',
  ])('falha: %s', (corpo) => {
    expect(rodarRepo(repo(corpo)).status).toBe(1);
  });

  it('forma não analisável aceita exceção com motivo e dados literais passam', () => {
    const corpo = repo('export const f = (globalThis as any).envolver((id: string) => id);');
    expect(rodarRepo(corpo, [{ arquivo: 'partidas.ts', funcao: 'f', motivo: 'envolvida' }]).status).toBe(0);
    expect(
      rodarRepo(
        repo(
          "export const k = { a: 1, b: 'x' }; export class V extends Error { constructor(readonly id: string) { super(id); } }",
        ),
      ).status,
    ).toBe(0);
  });

  it('exceção válida passa; exceção obsoleta falha', () => {
    const corpo = repo('export function f(id: string) { return id; }');
    expect(rodarRepo(corpo, [{ arquivo: 'partidas.ts', motivo: 'dado do dono' }]).status).toBe(0);
    const ok = repo('export function f(grupoId: string) { return grupoId; }');
    expect(rodarRepo(ok, [{ arquivo: 'partidas.ts', motivo: 'obsoleta' }]).status).toBe(1);
  });

  it('função errada reexportada por export * é avaliada', () => {
    const r = rodarRepo({
      'interno.ts': 'export function errada(x: string) { return x; }',
      'indice.ts': "export * from './interno';",
    });
    expect(r.status).toBe(1);
  });

  it('erro de sintaxe e pasta ausente falham fechado', () => {
    expect(rodarRepo(repo('export function f( {')).status).toBe(2);
    expect(rodar('checar-grupo-id.mjs', join(tmpdir(), 'nao-existe-xyz')).status).toBe(2);
  });
});
