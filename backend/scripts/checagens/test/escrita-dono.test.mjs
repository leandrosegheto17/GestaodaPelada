import { ESLint } from 'eslint';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(import.meta.dirname, '../../../..');
const eslint = new ESLint({ cwd: RAIZ });
const REGRA = 'pelada/sem-escrita-dono';

/** Quantos achados da regra G-11 o código tem quando está em `arquivo` (caminho relativo à raiz). */
async function achados(codigo, arquivo) {
  const [resultado] = await eslint.lintText(codigo, { filePath: resolve(RAIZ, arquivo) });
  // Código que não compila não pode contar como "sem achados".
  const erro = resultado.messages.find((m) => m.fatal);
  if (erro) throw new Error(`erro de sintaxe no fixture: ${erro.message}`);
  return resultado.messages.filter((m) => m.ruleId === REGRA).length;
}

const ROTA = 'backend/api/src/entrada/rotas/x.ts';
const CONTAS = 'backend/api/src/infraestrutura/db/repositorios/contas.ts';
const CAMPOS_LONGOS = Array.from({ length: 40 }, (_, i) => `campo${i}: 1`).join(', ');

describe('regra pelada/sem-escrita-dono (G-11)', () => {
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
    "let i = 3; i--; await db.insertInto('c').values({ e_dono: true }).execute();",
    "let i = 3; --i; await db.insertInto('c').values({ e_dono: true }).execute();",
    'await db.insertInto("c").values({ u: "http://x", eDono: true }).execute();',
    'const o = {};\no["e_dono"] = true;\nawait db.insertInto(\'c\').values(o).execute();',
    "const o = {};\no.eDono ||= true;\nawait db.insertInto('c').values(o).execute();",
    "const o = { eDono: f(x) };\nawait db.insertInto('c').values(o).execute();",
    "const o = { eDono: x.y || z };\nawait db.updateTable('c').set(o).execute();",
    "const o = {};\no.eDono |= true;\nawait db.insertInto('c').values(o).execute();",
    "const o = {};\no.eDono &= x;\nawait db.insertInto('c').values(o).execute();",
    "const o = {};\no.eDono ^= x;\nawait db.updateTable('c').set(o).execute();",
    "const o = {};\no.eDono >>= 1;\nawait db.updateTable('c').set(o).execute();",
    "const o = {};\no.eDono <<= 1;\nawait db.updateTable('c').set(o).execute();",
    "const o = {};\no.eDono >>>= 1;\nawait db.updateTable('c').set(o).execute();",
    // Contornos que a checagem por texto não via.
    'const eDono = true;\nawait db.insertInto("c").values({ eDono }).execute();',
    "await db.updateTable('c').set('e_dono', true).execute();",
    "await db.insertInto('c').columns(['nome', 'e_dono']).values(['a', true]).execute();",
    "const o = {};\no.eDono++;\nawait db.updateTable('c').set(o).execute();",
    "const o = { ['e_' + 'dono']: true };\nawait db.updateTable('c').set(o).execute();",
    "const o = { [`e_dono`]: true };\nawait db.updateTable('c').set(o).execute();",
    "const o = { eDono: await ler() };\nawait db.updateTable('c').set(o).execute();",
    "const o = { eDono: `${x}` };\nawait db.updateTable('c').set(o).execute();",
    "const nome = 'e_' + parte;\nawait db.updateTable('c').set({ [nome]: true }).execute();",
    "const o = {};\no[`eDono`] = true;\nawait db.updateTable('c').set(o).execute();",
    "const o = {};\no?.['e_dono'];\no.eDono = v;\nawait db.updateTable('c').set(o).execute();",
    "await db.updateTable('c').set({ ...base, e_dono: true }).execute();",
    "await db.insertInto('c').values([{ nome: 'a', e_dono: true }, { nome: 'b' }]).execute();",
    "await db.updateTable('c').set((eb) => ({ e_dono: eb.val(true) })).execute();",
    "await sql.raw('UPDATE contas SET e_dono = true');",
    "await c.query('INSERT INTO contas (e_dono) VALUES (true)');",
  ])('falha: %s', async (codigo) => {
    expect(await achados(codigo, ROTA)).toBeGreaterThan(0);
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
    'export const ler = (c) => ({ eDono: c.eDono, outro: f(c) });',
    'export const s = { eDono: z.boolean(), n: 1 };',
    'export const s = { eDono: z.boolean().optional(), n: 1 };',
    'if (c["e_dono"] === true || c.eDono !== false) { x(); }',
    'if (c.eDono <= 1 || c.eDono >= 1 || c.eDono != 2) { x(); }',
    "const u = 'http://x'; // db.insertInto('c').values({ e_dono: true })\nexport {};",
    'export const ler = (c) => ({ eDono: c.conta?.eDono, n: 1 });',
    'export const ler = (c) => ({ eDono: c.eDono === true });',
    'const { eDono } = sessao.conta;\nexport { eDono };',
    "const COLUNAS = ['id', 'e_dono'] as const;\nexport { COLUNAS };",
    "export const eDonoSempre = 'e_dono';",
  ])('passa: %s', async (codigo) => {
    expect(await achados(codigo, ROTA)).toBe(0);
  });

  it('não confere backend/scripts, migrações, testes nem as ferramentas do contrato', async () => {
    const escrita = "await db.insertInto('contas').values({ e_dono: true }).execute();";
    const sql = 'await sql`INSERT INTO contas (e_dono) VALUES (true)`;';
    for (const arquivo of [
      'backend/scripts/dono.ts',
      'backend/api/src/infraestrutura/db/migracoes/x.ts',
      'backend/api/test/apoio/x.ts',
      'backend/api/src/entrada/x.test.ts',
      'backend/contrato/ferramentas/x.ts',
    ]) {
      expect(await achados(escrita, arquivo)).toBe(0);
      expect(await achados(sql, arquivo)).toBe(0);
    }
  });

  describe('repositório de contas', () => {
    const criarDono =
      "export async function criarContaDono(ex) {\n  await ex.insertInto('contas').values({ e_dono: true }).execute();\n}\n";
    const outra =
      "export async function promoverADono(ex, id) {\n  await ex.updateTable('contas').set({ e_dono: true }).execute();\n}\n";
    const comoConstante =
      "export const criarContaDono = async (ex) => {\n  await ex.insertInto('contas').values({ e_dono: true }).execute();\n};\n";

    it('passa: só criarContaDono escreve o papel', async () => {
      expect(await achados(criarDono, CONTAS)).toBe(0);
      expect(await achados(comoConstante, CONTAS)).toBe(0);
    });

    it('falha: outra função do arquivo escreve o papel', async () => {
      expect(await achados(`${criarDono}\n${outra}`, CONTAS)).toBeGreaterThan(0);
    });

    it('falha: outra função antes de criarContaDono escreve o papel', async () => {
      expect(await achados(`${outra}\n${criarDono}`, CONTAS)).toBeGreaterThan(0);
    });

    it('falha: a exceção vale só em contas.ts', async () => {
      expect(await achados(criarDono, ROTA)).toBeGreaterThan(0);
    });
  });
});
