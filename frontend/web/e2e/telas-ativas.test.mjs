import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  const comLista = (conteudo, ...args) => {
    const dir = mkdtempSync(join(tmpdir(), 'telas-'));
    const arquivo = join(dir, 'lista.txt');
    writeFileSync(arquivo, conteudo);
    try {
      return rodar2(arquivo, args);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const rodar2 = (arquivo, args) =>
    spawnSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      env: { ...process.env, TELAS_ATIVAS_ARQUIVO: arquivo },
    });

  it('lista vazia sai com 0 sem chamar a comparação', () => {
    const r = comLista('# nada');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Nenhuma tela ativa/);
  });

  it('id inválido no arquivo sai com 2', () => {
    expect(comLista('T99').status).toBe(2);
  });

  it('--tela com id inválido sai com 2', () => {
    expect(comLista('', '--tela', 'T99').status).toBe(2);
  });

  it('dist/ ausente sai com 2 e orienta o build', () => {
    const dir = mkdtempSync(join(tmpdir(), 'telas-'));
    try {
      const config = JSON.parse(readFileSync(join(import.meta.dirname, '../../../.md/mockup/telas.json'), 'utf8'));
      const arquivo = join(dir, 'lista.txt');
      writeFileSync(arquivo, config.telas[0].id);
      const r = spawnSync(process.execPath, [script], {
        encoding: 'utf8',
        env: { ...process.env, TELAS_ATIVAS_ARQUIVO: arquivo, DIST_DIR: join(dir, 'dist-inexistente') },
      });
      expect(r.status).toBe(2);
      expect(r.stderr).toMatch(/dist\/ ausente/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
