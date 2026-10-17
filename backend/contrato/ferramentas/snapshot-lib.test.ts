import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { conferir, executarSnapshot, gerarInstantaneos, gravar, lerSnapshot, temSnapshot } from './snapshot-lib.js';

const pastas: string[] = [];
const temporaria = (): string => {
  const p = mkdtempSync(join(tmpdir(), 'snap-'));
  pastas.push(p);
  return p;
};
afterEach(() => {
  while (pastas.length) rmSync(pastas.pop()!, { recursive: true, force: true });
});

describe('lerSnapshot falha fechado', () => {
  it('pasta ausente', () => {
    expect(() => lerSnapshot(join(temporaria(), 'nao-existe'))).toThrow(/ausente/);
    expect(temSnapshot(join(temporaria(), 'nao-existe'))).toBe(false);
  });
  it('pasta vazia', () => {
    expect(() => lerSnapshot(temporaria())).toThrow(/vazio/);
  });
  it('JSON corrompido', () => {
    const p = temporaria();
    writeFileSync(join(p, 'x.json'), '{ nao é json');
    expect(() => lerSnapshot(p)).toThrow();
  });
  it('JSON sem direção ou esquema', () => {
    const p = temporaria();
    writeFileSync(join(p, 'x.json'), '{"direcao":"outra"}');
    expect(() => lerSnapshot(p)).toThrow(/corrompido/);
  });
});

describe('executarSnapshot (CLI snapshot)', () => {
  const lerTudo = (p: string) => Object.fromEntries(readdirSync(p).map((n) => [n, readFileSync(join(p, n), 'utf8')]));

  it('recusa regravar com quebra não listada: código 1 e snapshot intacto', () => {
    const p = temporaria();
    const atual = gerarInstantaneos();
    const nome = Object.keys(atual).find((n) => atual[n]!.direcao === 'resposta')!;
    const antigo = JSON.parse(JSON.stringify(atual)) as typeof atual;
    const esquema = antigo[nome]!.esquema as { properties?: Record<string, unknown> };
    esquema.properties = { ...(esquema.properties ?? {}), campoRemovido: { type: 'string' } };
    gravar(antigo, p);
    const antes = lerTudo(p);
    const r = executarSnapshot(atual, '', p);
    expect(r.codigo).toBe(1);
    expect(r.mensagens.join('\n')).toMatch(/campoRemovido/);
    expect(lerTudo(p)).toEqual(antes);
  });
  it('sem quebra regrava e devolve 0', () => {
    const p = temporaria();
    expect(executarSnapshot(gerarInstantaneos(), '', p).codigo).toBe(0);
    expect(temSnapshot(p)).toBe(true);
  });
});

describe('snapshot versionado', () => {
  it('gravar e ler devolvem o mesmo conteúdo, sem quebra nem defasagem', () => {
    const p = temporaria();
    mkdirSync(p, { recursive: true });
    const atual = gerarInstantaneos();
    gravar(atual, p);
    const lido = lerSnapshot(p);
    expect(conferir(atual, lido, '')).toEqual({ quebras: [], eDono: [], desatualizados: [] });
  });
  it('o snapshot do repositório está em dia com o código', () => {
    const r = conferir(gerarInstantaneos(), lerSnapshot(), '');
    expect(r.quebras).toEqual([]);
    expect(r.eDono).toEqual([]);
    expect(r.desatualizados).toEqual([]);
  });
  it('snapshot com campo a mais que o código é quebra não listada (snapshot recusaria regravar)', () => {
    const atual = gerarInstantaneos();
    const antigo = lerSnapshot();
    const nome = Object.keys(atual).find((n) => atual[n]!.direcao === 'resposta')!;
    const esquema = JSON.parse(JSON.stringify(antigo[nome]!.esquema)) as { properties?: Record<string, unknown> };
    esquema.properties = { ...(esquema.properties ?? {}), campoRemovido: { type: 'string' } };
    expect(conferir(atual, { ...antigo, [nome]: { direcao: 'resposta', esquema } }, '').quebras.length).toBeGreaterThan(
      0,
    );
  });
});
