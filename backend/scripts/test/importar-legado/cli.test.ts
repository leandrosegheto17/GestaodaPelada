import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lerArgumentosLegado } from '../../importar-legado/argumentos.ts';
import { ErroLegado } from '../../importar-legado/tipos.ts';

const RAIZ = resolve(import.meta.dirname, '../../../..');
const SCRIPTS = join(RAIZ, 'backend/scripts');
const BASE = ['--grupo', 'meu-grupo', '--cadastro', 'cadastro.md', '--rodadas', 'rodadas.md'];

function executar(args: string[], url?: string) {
  const env: NodeJS.ProcessEnv = { ...process.env, CI: 'true' };
  delete env['DATABASE_URL'];
  if (url) env['DATABASE_URL'] = url;
  return spawnSync(process.execPath, ['--import', 'tsx', join(SCRIPTS, 'importar-legado.ts'), ...args], {
    encoding: 'utf8',
    env,
    cwd: RAIZ,
  });
}

describe('argumentos', () => {
  it('lê os argumentos válidos', () => {
    expect(lerArgumentosLegado([...BASE, '--dry-run'])).toEqual({
      grupo: 'meu-grupo',
      cadastro: 'cadastro.md',
      rodadas: 'rodadas.md',
      alvo: undefined,
      dryRun: true,
      confirmoBackup: false,
    });
    expect(lerArgumentosLegado([...BASE, '--confirmo-backup', '--alvo', 'producao'])).toMatchObject({
      dryRun: false,
      confirmoBackup: true,
      alvo: 'producao',
    });
  });

  it.each([
    ['URL por argumento', [...BASE, '--url', 'postgres://u:senha-secreta@h/db']],
    ['database-url por argumento', [...BASE, '--database-url', 'postgres://u:senha-secreta@h/db']],
    ['valor solto', [...BASE, 'postgres://u:senha-secreta@h/db']],
    ['flag sem valor', ['--grupo', '--cadastro', 'a', '--rodadas', 'b']],
    ['grupo ausente', ['--cadastro', 'a', '--rodadas', 'b']],
    ['cadastro ausente', ['--grupo', 'g', '--rodadas', 'b']],
    ['rodadas ausente', ['--grupo', 'g', '--cadastro', 'a']],
    ['nenhum argumento', []],
  ])('recusa %s', (_nome, argv) => {
    try {
      lerArgumentosLegado(argv);
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroLegado);
      expect((erro as Error).message).not.toContain('senha-secreta');
      return;
    }
    throw new Error('Esperava recusa.');
  });
});

describe('conexão só pelo ambiente', () => {
  it('flag de URL é recusada sem vazar a senha nem conectar', { timeout: 60_000 }, () => {
    const r = executar([...BASE, '--url', 'postgres://u:senha-secreta@localhost:1/db']);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('DATABASE_URL');
    expect(r.stdout + r.stderr).not.toContain('senha-secreta');
  });

  it.each([
    'postgres://u:senha-secreta@ep-x.neon.tech/db',
    'postgres://u:senha-secreta@LOCALHOST.algo.com/db',
    'postgres://u:senha-secreta@localhost/db?host=remoto.com',
    undefined,
  ])('trava de host: %s é recusado mesmo com --alvo e CI=true', { timeout: 60_000 }, (url) => {
    for (const extra of [[], ['--alvo', 'producao'], ['--alvo', 'teste']]) {
      const r = executar([...BASE, '--dry-run', ...extra], url);
      expect(r.status).toBe(1);
      expect(r.stdout + r.stderr).not.toContain('senha-secreta');
    }
  });

  it('o código do script não lê .env nem arquivo do projeto para achar a conexão', () => {
    const pasta = join(SCRIPTS, 'importar-legado');
    const fontes = [join(SCRIPTS, 'importar-legado.ts'), ...readdirSync(pasta).map((nome) => join(pasta, nome))].map(
      (arquivo) => readFileSync(arquivo, 'utf8'),
    );
    for (const fonte of fontes) {
      expect(fonte).not.toMatch(/dotenv|loadEnvFile|['"`][^'"`\n]*\.env['"`]|wrangler\.jsonc|hyperdrive/i);
    }
    const principal = fontes[0] ?? '';
    expect(principal.match(/process\.env\[/g)?.length).toBeLessThanOrEqual(2);
    expect(principal).toContain("process.env['DATABASE_URL']");
  });
});
