import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(import.meta.dirname, '..', 'checar-escrita-e-dono.mjs');
const temporarias = [];

function repositorio(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'dono-'));
  temporarias.push(raiz);
  execFileSync('git', ['init', '-q'], { cwd: raiz });
  for (const [nome, texto] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(raiz, nome)), { recursive: true });
    writeFileSync(join(raiz, nome), texto);
  }
  return raiz;
}

const rodar = (raiz, ambiente = process.env) =>
  spawnSync(process.execPath, [SCRIPT, raiz], { encoding: 'utf8', env: ambiente }).status;

afterEach(() => {
  while (temporarias.length) rmSync(temporarias.pop(), { recursive: true, force: true });
});

const CAMPOS_LONGOS = Array.from({ length: 40 }, (_, i) => `campo${i}: 1`).join(', ');
const rota = (corpo) => ({ 'backend/api/src/entrada/rotas/x.ts': corpo });

describe('checar-escrita-e-dono', () => {
  it.each([
    'await sql`INSERT INTO contas (email, e_dono) VALUES (${e}, true)`;',
    'await sql`UPDATE contas SET e_dono = true WHERE id = ${id}`;',
    'await sql`update contas set E_DONO = true`;',
    "await db.updateTable('contas').set({ e_dono: true }).execute();",
    "await db.insertInto('contas').values({ eDono: true }).execute();",
    "const chave = 'e_' + 'dono'; await db.updateTable('contas').set({ [chave]: true }).execute();",
    'await sql`INSERT INTO contas (email, "e_dono")\n VALUES (1, true)`;',
    `await db.insertInto('contas').values({ ${CAMPOS_LONGOS}, e_dono: true }).execute();`,
    `await sql\`UPDATE contas SET ${CAMPOS_LONGOS.replaceAll(': 1', ' = 1')}, e_dono = true\`;`,
    "await db.insertInto('c').values({ nome: 'a;b', e_dono: true }).execute();",
    'await db.insertInto("c").values({ nome: "a;b", eDono: true }).execute();',
    "const o = { e_dono: true };\nawait db.insertInto('contas').values(o).execute();",
    "const o = { nome: 'x', 'eDono': true };\nawait db.updateTable('contas').set(o).execute();",
    "const o = {};\no.e_dono = true;\nawait db.insertInto('c').values(o).execute();",
    "const o = {};\no.eDono = !!x;\nawait db.insertInto('c').values(o).execute();",
    "const o = { e_dono: !!x };\nawait db.updateTable('c').set(o).execute();",
    "const o = { nome: 'x', eDono: a ? b : c };\nawait db.updateTable('c').set(o).execute();",
    "await db.insertInto('c').values({ u: 'http://x', e_dono: true }).execute();",
    "await db.insertInto('c').values({ u: 'a--b', e_dono: true }).execute();",
    'await db.insertInto("c").values({ u: "http://x", eDono: true }).execute();',
  ])('falha: %s', (corpo) => {
    expect(rodar(repositorio(rota(corpo)))).toBe(1);
  });

  it.each([
    '// UPDATE contas SET e_dono = true\nexport {};',
    '/* INSERT INTO contas (e_dono) */ export {};',
    "const aviso = 'nunca gravar e_dono';\nexport {};",
    "const donos = await db.selectFrom('contas').select('e_dono').where('e_dono', '=', true).execute();",
    'export const ehDono = (conta) => conta.eDono === true;',
    "const a = 'x;y'; const donos = await db.selectFrom('contas').select('e_dono').execute();",
    `const donos = await db.selectFrom('contas').select(['${CAMPOS_LONGOS}', 'e_dono']).where('e_dono', '=', true).execute();`,
    'export const ehDono = (conta) => conta.e_dono == true;',
    'export const ler = (conta) => ({ eDono: conta.eDono, outro: 1 });',
    'if (conta.eDono === true) { x(); }',
    "const u = 'http://x'; // db.insertInto('c').values({ e_dono: true })\nexport {};",
    "const u = 'a--b'; -- values({ e_dono: true })\nexport {};",
  ])('passa: %s', (corpo) => {
    expect(rodar(repositorio(rota(corpo)))).toBe(0);
  });

  it('passa em backend/scripts, migrações e testes', () => {
    const sql = 'INSERT INTO contas (e_dono) VALUES (true);';
    const raiz = repositorio({
      'backend/scripts/dono.ts': `await sql\`${sql}\`;`,
      'backend/api/src/infraestrutura/db/migracoes/202610010000_x.sql': sql,
      'backend/api/test/apoio/x.ts': `await sql\`${sql}\`;`,
      'backend/api/src/entrada/ok.ts': 'export {};',
    });
    expect(rodar(raiz)).toBe(0);
  });

  describe('contas.ts', () => {
    const CAMINHO = 'backend/api/src/infraestrutura/db/repositorios/contas.ts';
    const criarDono =
      "export async function criarContaDono(ex) {\n  await ex.insertInto('contas').values({ e_dono: true }).execute();\n}\n";
    const outra =
      "export async function promoverADono(ex, id) {\n  await ex.updateTable('contas').set({ e_dono: true }).execute();\n}\n";

    it('passa: só criarContaDono escreve e_dono', () => {
      expect(rodar(repositorio({ [CAMINHO]: criarDono }))).toBe(0);
    });

    it('falha: outra função do arquivo escreve e_dono', () => {
      expect(rodar(repositorio({ [CAMINHO]: criarDono + '\n' + outra }))).toBe(1);
    });

    it('falha: outra função antes de criarContaDono escreve e_dono', () => {
      expect(rodar(repositorio({ [CAMINHO]: outra + '\n' + criarDono }))).toBe(1);
    });
  });

  it('falha fechado: sem arquivos de código e sem git', () => {
    expect(rodar(repositorio({ 'README.md': 'x' }))).toBe(2);
    expect(rodar(repositorio(rota('export {};')), { ...process.env, PATH: '' })).toBe(2);
  });
});
