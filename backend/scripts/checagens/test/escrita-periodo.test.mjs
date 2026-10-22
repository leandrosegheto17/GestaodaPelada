import { ESLint } from 'eslint';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(import.meta.dirname, '..', 'checar-escrita-periodo.mjs');
const temporarias = [];

const RAIZ_PROJETO = resolve(import.meta.dirname, '../../../..');
const eslint = new ESLint({ cwd: RAIZ_PROJETO });

/** Achados da regra G-26 para `codigo` quando ele está em `arquivo` (caminho relativo à raiz do projeto). */
async function achadosPeriodo(codigo, arquivo) {
  const [resultado] = await eslint.lintText(codigo, { filePath: resolve(RAIZ_PROJETO, arquivo) });
  const erro = resultado.messages.find((m) => m.fatal);
  if (erro) throw new Error(`erro de sintaxe no fixture: ${erro.message}`);
  return resultado.messages.filter((m) => m.ruleId === 'pelada/sem-escrita-periodo').length;
}

function repositorio(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'periodo-'));
  temporarias.push(raiz);
  execFileSync('git', ['init', '-q'], { cwd: raiz });
  for (const [nome, texto] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, nome)), { recursive: true });
    writeFileSync(join(raiz, nome), texto);
  }
  return raiz;
}

const rodar = (arquivos) => {
  const r = spawnSync(process.execPath, [SCRIPT, repositorio(arquivos)], { encoding: 'utf8' });
  return { status: r.status, saida: r.stdout + r.stderr };
};

afterEach(() => {
  while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true });
});

const SRC = 'backend/api/src';
const REPOS = `${SRC}/infraestrutura/db/repositorios`;
const ROTAS = `${SRC}/entrada/rotas`;
const base = {
  [`${REPOS}/jogadores.ts`]: 'export async function reativar() { await sql`UPDATE periodos_ativos SET fim = null`; }\n',
  [`${REPOS}/periodos-corrigir.ts`]: "banco.updateTable('periodos_ativos').set({ fim: 1 });\n",
};
const APLICACAO = `${SRC}/aplicacao/x.ts`;
const rota = (nome, corpo, extra = {}) => ({ ...base, [`${ROTAS}/${nome}`]: corpo, ...extra });

describe('regra pelada/sem-escrita-periodo: escrita em periodos_ativos fora do repositório', () => {
  it.each([
    'await sql`UPDATE periodos_ativos SET inicio = ${d}`;',
    'await sql`update periodos_ativos set fim = ${d}`;',
    'await sql`INSERT INTO periodos_ativos (jogador_id, inicio) VALUES (${j}, ${d})`;',
    'await sql`UPDATE public."periodos_ativos" SET fim = ${d}`;',
    'await sql`UPDATE\n  periodos_ativos\n SET fim = ${d}`;',
    "await db.updateTable('periodos_ativos').set({ fim: d }).execute();",
    "await db.insertInto('periodos_ativos').values({ inicio: d }).execute();",
    "await db.insertInto('c').values({ nome: 'a;b' }).execute(); await sql`UPDATE periodos_ativos SET fim = 1`;",
    "const t = 'periodos_ativos';\nawait db.updateTable(t).set({ fim: d }).execute();",
    "const t = 'periodos' + '_ativos';\nawait db.updateTable(t).set({ fim: d }).execute();",
    'const t = `periodos_${x}`;\nawait db.updateTable(t).set({ fim: d }).execute();',
    "await db\n  .with('x', (qb) => qb)\n  .insertInto('periodos_ativos')\n  .values(v)\n  .execute();",
    // Contornos que a checagem por texto não via.
    "const t = 'periodos' + x;\nawait db.updateTable(t).set({ fim: d }).execute();",
    "await db.mergeInto('periodos_ativos').using('x', 'a', 'b').execute();",
    'await sql`WITH x AS (SELECT 1) UPDATE ONLY periodos_ativos SET fim = 1`;',
    "await client.query('INSERT INTO periodos_ativos (inicio) VALUES ($1)', [d]);",
    "await client.query('MERGE INTO public.periodos_ativos USING x ON true');",
  ])('barra: %s', async (codigo) => {
    expect(await achadosPeriodo(codigo, APLICACAO)).toBeGreaterThan(0);
  });

  it.each([
    "await db.selectFrom('periodos_ativos').select('id').execute();",
    'await sql`SELECT * FROM jogadores j LEFT JOIN periodos_ativos p ON p.jogador_id = j.id`;',
    "await db.insertInto('jogadores').values({ nome: 'a;b' }).execute(); await db.selectFrom('periodos_ativos').selectAll();",
    '// UPDATE periodos_ativos SET fim = 1\nconst a = 1;',
    "/* await db.updateTable('periodos_ativos').set({}) */ const a = 1;",
    "const texto = 'UPDATE jogadores SET x = 1';",
    "await db.deleteFrom('periodos_ativos').execute();",
    'await sql`SELECT id FROM periodos_ativos WHERE jogador_id = ${j} FOR UPDATE`;',
    'await sql`INSERT INTO jogadores (nome) SELECT nome FROM periodos_ativos`;',
  ])('aceita: %s', async (codigo) => {
    expect(await achadosPeriodo(codigo, APLICACAO)).toBe(0);
  });

  it('não confere os dois repositórios do período, os testes nem as migrações', async () => {
    const escrita = 'await sql`UPDATE periodos_ativos SET fim = 1`;';
    for (const arquivo of [
      `${REPOS}/jogadores.ts`,
      `${REPOS}/periodos-corrigir.ts`,
      'backend/api/test/x.ts',
      `${SRC}/infraestrutura/db/migracoes/x.ts`,
    ]) {
      expect(await achadosPeriodo(escrita, arquivo)).toBe(0);
    }
  });

  it('confere os outros repositórios', async () => {
    expect(
      await achadosPeriodo('await sql`UPDATE periodos_ativos SET fim = 1`;', `${REPOS}/partidas.ts`),
    ).toBeGreaterThan(0);
  });
});

describe('arquivo .sql fora das migrações', () => {
  const sqlSolto = (corpo) =>
    rodar({ ...base, 'backend/scripts/ops/x.sql': corpo, [`${SRC}/aplicacao/y.ts`]: 'export {};' });

  it.each([
    'UPDATE periodos_ativos SET fim = 1;',
    'update\n  public."periodos_ativos"\nset fim = 1;',
    'INSERT INTO periodos_ativos (a) VALUES (1);',
  ])('barra %s', (corpo) => {
    expect(sqlSolto(corpo).status).toBe(1);
  });

  it.each([
    'SELECT * FROM periodos_ativos;',
    '-- UPDATE periodos_ativos SET fim = 1\nSELECT 1;',
    "SELECT 'UPDATE periodos_ativos';",
  ])('aceita %s', (corpo) => {
    expect(sqlSolto(corpo).status).toBe(0);
  });
});

describe('rota que escreve período', () => {
  const app = (corpo) => ({ [`${SRC}/aplicacao/elenco/app.ts`]: corpo });
  const importaJogadores = "import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';\n";
  const rotaImportaApp = "import { f } from '../../../aplicacao/elenco/app.js';\n";

  it.each([
    ['namespace', `${importaJogadores}export const f = () => jogadores.inativar();`],
    ['namespace opcional', `${importaJogadores}export const f = () => jogadores?.reativar();`],
    ['colchetes', `${importaJogadores}export const f = () => jogadores['alterarInicio']();`],
    ['criar', `${importaJogadores}export const f = () => jogadores.criar();`],
    ['apelido nomeado', "import { reativar as r } from '../../infraestrutura/db/repositorios/jogadores.js';\nr();"],
    ['nomeado', "import { inativar, buscar } from '../../infraestrutura/db/repositorios/jogadores.js';\ninativar();"],
    ['desestruturado', `${importaJogadores}const { inativar } = jogadores;\ninativar();`],
    ['reexporta tudo', "export * from '../../infraestrutura/db/repositorios/jogadores.js';"],
    ['reexporta nomeado', "export { reativar } from '../../infraestrutura/db/repositorios/jogadores.js';"],
    ['import dinâmico', "const m = await import('../../infraestrutura/db/repositorios/jogadores.js');"],
    ['corrigirPeriodo', "import { corrigirPeriodo } from '../../infraestrutura/db/repositorios/periodos-corrigir.js';"],
  ])('barra a rota que chega ao repositório por %s (direto na aplicação)', (_nome, corpo) => {
    const r = rodar(rota('grupos/fake.ts', rotaImportaApp, app(corpo)));
    expect(r.status).toBe(1);
    expect(r.saida).toContain(`${ROTAS}/grupos/fake.ts`);
  });

  it('barra a rota que escreve direto, sem camada de aplicação', () => {
    const corpo = "import { reativar } from '../../../infraestrutura/db/repositorios/jogadores.js';\nreativar();";
    expect(rodar(rota('grupos/fake.ts', corpo)).status).toBe(1);
  });

  it('barra a rota que chega por uma cadeia de aplicação', () => {
    const r = rodar(
      rota('grupos/fake.ts', rotaImportaApp, {
        ...app("import { g } from './meio.js';\nexport const f = g;"),
        [`${SRC}/aplicacao/elenco/meio.ts`]: `${importaJogadores}export const g = () => jogadores.inativar();`,
      }),
    );
    expect(r.status).toBe(1);
  });

  it.each(['grupos/jogadores/periodos-corrigir.ts', 'grupos/jogadores/situacao.ts'])(
    'aceita a rota permitida %s',
    (nome) => {
      const corpo = `${importaJogadores}export const f = () => jogadores.inativar();`;
      expect(rodar(rota(nome, rotaImportaApp, app(corpo))).status).toBe(0);
    },
  );

  it.each([
    ['só lê', `${importaJogadores}export const f = () => jogadores.buscar();`],
    ['comentário', `// ${importaJogadores.trim()}\n// jogadores.inativar();\nexport const f = 1;`],
    ['texto', `${importaJogadores}export const f = 'jogadores.inativar()';`],
    ['outro módulo', "import { inativar } from '../../infraestrutura/db/repositorios/partidas.js';\ninativar();"],
    ['tipo', "import type { reativar } from '../../infraestrutura/db/repositorios/jogadores.js';"],
  ])('aceita a rota que %s', (_nome, corpo) => {
    expect(rodar(rota('grupos/fake.ts', rotaImportaApp, app(corpo))).status).toBe(0);
  });
});
