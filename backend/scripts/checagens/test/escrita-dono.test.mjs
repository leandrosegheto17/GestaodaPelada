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
  ])('falha: %s', (corpo) => {
    expect(rodar(repositorio(rota(corpo)))).toBe(1);
  });

  it.each([
    '// UPDATE contas SET e_dono = true\nexport {};',
    '/* INSERT INTO contas (e_dono) */ export {};',
    "const aviso = 'nunca gravar e_dono';\nexport {};",
    "const donos = await db.selectFrom('contas').select('e_dono').where('e_dono', '=', true).execute();",
    'export const ehDono = (conta) => conta.eDono === true;',
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

  it('falha fechado: sem arquivos de código e sem git', () => {
    expect(rodar(repositorio({ 'README.md': 'x' }))).toBe(2);
    expect(rodar(repositorio(rota('export {};')), { ...process.env, PATH: '' })).toBe(2);
  });
});
