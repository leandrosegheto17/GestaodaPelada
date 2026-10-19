import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(import.meta.dirname, '..', 'checar-wrangler-deploy.mjs');
const temporarias = [];

function repositorio(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'wrangler-'));
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

describe('checar-wrangler-deploy', () => {
  it.each([
    ['.github/workflows/ci.yml', '      - run: pnpm exec wrangler deploy\n'],
    ['package.json', '{ "scripts": { "publicar": "wrangler deploy --env teste" } }\n'],
    ['scripts/publicar.sh', 'wrangler \\\n  deploy\n'],
    ['scripts/a.sh', 'npx wrangler@3 deploy\n'],
    ['.github/workflows/outro.yml', '      - run: pnpm exec wrangler  deploy --env teste\n'],
    ['scripts/b.mjs', "execSync('wrangler versions deploy');\n"],
    [
      '.github/workflows/ci.yml',
      '      - run: pnpm --filter @pelada/api exec wrangler deploy -c ../../wrangler.jsonc\n',
    ],
    ['scripts/d.sh', 'pnpm --filter @pelada/api exec wrangler versions deploy -c ../../wrangler.jsonc\n'],
  ])('falha: %s', (nome, texto) => {
    expect(rodar(repositorio({ [nome]: texto }))).toBe(1);
  });

  it.each([
    ['.github/workflows/deploy.yml', '      - run: pnpm exec wrangler deploy\n'],
    [
      '.github/workflows/deploy.yml',
      '      - run: pnpm --filter @pelada/api exec wrangler deploy -c ../../wrangler.jsonc\n',
    ],
    ['backend/DEPLOY.md', 'Rode `wrangler deploy` no workflow.\n'],
    ['README.md', 'wrangler deploy\n'],
    ['package.json', '{ "scripts": { "local": "wrangler dev" } }\n'],
    ['scripts/c.sh', 'wrangler deployments list\n'],
  ])('passa: %s', (nome, texto) => {
    expect(rodar(repositorio({ [nome]: texto, 'src/ok.ts': 'export {};\n' }))).toBe(0);
  });

  it('sem git no PATH falha fechado com código 2', () => {
    const raiz = repositorio({ 'src/ok.ts': 'export {};\n' });
    expect(rodar(raiz, { ...process.env, PATH: '' })).toBe(2);
  });

  it('o repositório real está verde', () => {
    expect(rodar(resolve(import.meta.dirname, '../../../..'))).toBe(0);
  });
});
