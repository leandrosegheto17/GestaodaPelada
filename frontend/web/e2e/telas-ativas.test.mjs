import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lerTelasAtivas } from './telas-ativas.mjs';

const IDS = ['T01', 'T02', 'T03'];

describe('lerTelasAtivas', () => {
  it('vazio e só comentários não ativam nada', () => {
    expect(lerTelasAtivas('', IDS)).toEqual([]);
    expect(lerTelasAtivas('# comentário\n\n  # outro\n', IDS)).toEqual([]);
  });

  it('aceita CRLF, espaços, comentário na linha e deduplica', () => {
    expect(lerTelasAtivas('T01\r\n  T02  # ok\r\nT01\r\n', IDS)).toEqual(['T01', 'T02']);
  });

  it('id inexistente ou em minúsculo é erro', () => {
    expect(() => lerTelasAtivas('T99', IDS)).toThrow(/T99/);
    expect(() => lerTelasAtivas('t01', IDS)).toThrow(/t01/);
  });
});

describe('visual.mjs', () => {
  const script = join(import.meta.dirname, 'visual.mjs');
  const rodar = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

  it('lista vazia sai com 0 sem criar resultado', () => {
    const r = rodar();
    expect(r.status).toBe(0);
    expect(existsSync(join(import.meta.dirname, 'resultado'))).toBe(false);
  });

  it('--tela com id inválido sai com 2', () => {
    expect(rodar('--tela', 'T99').status).toBe(2);
  });
});
