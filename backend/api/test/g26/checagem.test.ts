import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(import.meta.dirname, '../../../..');
const SCRIPT = resolve(RAIZ, 'backend/scripts/checagens/checar-escrita-periodo.mjs');

describe('correção de período em transação, travada e auditada', () => {
  it('a árvore do repositório passa na checagem de escrita de período', () => {
    const r = spawnSync(process.execPath, [SCRIPT, RAIZ], { encoding: 'utf8' });
    expect(r.stdout + r.stderr).not.toContain('fora do lugar permitido');
    expect(r.status).toBe(0);
  });
});
