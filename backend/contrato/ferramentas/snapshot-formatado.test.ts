import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { executarSnapshot, gerarInstantaneos } from './snapshot-lib.js';

const RAIZ = join(import.meta.dirname, '../../..');
const PRETTIER = join(RAIZ, 'node_modules/prettier/bin/prettier.cjs');
const CONFIG = join(RAIZ, '.prettierrc.json');

const pastas: string[] = [];
afterEach(() => {
  while (pastas.length) rmSync(pastas.pop()!, { recursive: true, force: true });
});

/** Grava o snapshot numa pasta temporária e formata como o script `snapshot` faz. */
function gerarFormatado(): string {
  const pasta = mkdtempSync(join(tmpdir(), 'snap-fmt-'));
  pastas.push(pasta);
  const { codigo } = executarSnapshot(gerarInstantaneos(), '', pasta);
  expect(codigo).toBe(0);
  execFileSync(process.execPath, [PRETTIER, '--config', CONFIG, '--write', pasta], { stdio: 'pipe' });
  return pasta;
}

describe('saída formatada do snapshot', () => {
  it('passa em prettier --check depois de formatada', () => {
    const pasta = gerarFormatado();
    expect(() =>
      execFileSync(process.execPath, [PRETTIER, '--config', CONFIG, '--check', pasta], { stdio: 'pipe' }),
    ).not.toThrow();
  });

  it('mantém array curto em uma linha', () => {
    const pasta = gerarFormatado();
    const textos = readdirSync(pasta).map((n) => readFileSync(join(pasta, n), 'utf8'));
    expect(textos.some((t) => /"required": \["[^\n]*"\]/.test(t))).toBe(true);
  });
});
