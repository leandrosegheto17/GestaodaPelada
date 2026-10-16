import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '../../../..');
const eslint = new ESLint({ cwd: RAIZ });

async function regras(codigo, arquivo) {
  const [resultado] = await eslint.lintText(codigo, { filePath: resolve(RAIZ, arquivo) });
  return resultado.messages
    .filter((m) => m.ruleId?.startsWith('no-restricted') || m.ruleId?.startsWith('import-x'))
    .map((m) => m.ruleId);
}

const WEB = 'frontend/web/src/x.ts';
const DOMINIO = 'backend/dominio/src/x.ts';
const API = 'backend/api/src/aplicacao/x.ts';
const DB = 'backend/api/src/infraestrutura/db/x.ts';

describe('fronteiras de pacote', () => {
  it.each([
    ["import { a } from '@pelada/dominio';", WEB],
    ["import { a } from '@pelada/api/src/x';", WEB],
    ["import { z } from 'zod';", DOMINIO],
    ["import pg from 'pg';", DOMINIO],
    ["import { Kysely } from 'kysely';", DOMINIO],
    ["import { Hono } from 'hono';", DOMINIO],
    ["import { a } from '@pelada/contrato';", DOMINIO],
    ["import pg from 'pg';", API],
    ["import { Kysely } from 'kysely';", API],
    ["export * from 'kysely';", API],
    ["const m = await import('pg');", API],
    ['const m = await import(nome);', API],
    ["import bcrypt from 'bcryptjs';", API],
    ["import axios from 'axios';", WEB],
    ["import { a } from '../../../../backend/dominio/src/x';", WEB],
  ])('barra %s em %s', async (codigo, arquivo) => {
    expect((await regras(codigo, arquivo)).length).toBeGreaterThan(0);
  });

  it.each([
    ["import pg from 'pg';", DB],
    ["// import pg from 'pg';", API],
    ["const nome = 'pg';", API],
    ["import { z } from 'zod';", API],
    ["import('jspdf');", WEB],
    ['', API],
    ['', DOMINIO],
  ])('aceita %s em %s', async (codigo, arquivo) => {
    expect(await regras(codigo, arquivo)).toEqual([]);
  });
});

describe('relógio (G-06)', () => {
  it.each(['Date.now();', "Date['now']();", 'globalThis.Date.now();', 'new Date();', 'new globalThis.Date();'])(
    'barra %s no domínio e na API',
    async (codigo) => {
      expect((await regras(codigo, DOMINIO)).length).toBeGreaterThan(0);
      expect((await regras(codigo, API)).length).toBeGreaterThan(0);
    },
  );

  it('aceita new Date(0) e o relógio de infraestrutura', async () => {
    expect(await regras('new Date(0);', DOMINIO)).toEqual([]);
    expect(await regras('Date.now();', 'backend/api/src/infraestrutura/relogio/relogio.ts')).toEqual([]);
  });
});

describe('conversões e cookie', () => {
  it('barra "as unknown as" e as duas formas de document.cookie', async () => {
    expect((await regras('const a = b as unknown as C;', API)).length).toBeGreaterThan(0);
    expect((await regras('const a = <C><unknown>b;', API)).length).toBeGreaterThan(0);
    for (const codigo of [
      'document.cookie;',
      "document['cookie'];",
      'window.document.cookie;',
      'globalThis.document.cookie;',
      'const { cookie } = document;',
    ]) {
      expect((await regras(codigo, WEB)).length, codigo).toBeGreaterThan(0);
    }
  });

  it('aceita document.cookie fora do web? não: só o web é restrito', async () => {
    expect(await regras('document.cookie;', 'backend/api/src/x.ts')).toEqual([]);
  });
});

describe('fronteiras por caminho real', () => {
  it('rota não importa rota', async () => {
    const ids = await regras("import { a } from './outra';", 'backend/api/src/entrada/rotas/uma.ts');
    expect(ids).toContain('import-x/no-restricted-paths');
  });

  it('scripts só importam os quatro caminhos permitidos', async () => {
    const fora = await regras("import { a } from '../api/src/aplicacao/partidas/x';", 'backend/scripts/x.ts');
    expect(fora).toContain('import-x/no-restricted-paths');
    const dentro = await regras("import { a } from '../api/src/aplicacao/acesso/senhas';", 'backend/scripts/x.ts');
    expect(dentro).not.toContain('import-x/no-restricted-paths');
  });
});
