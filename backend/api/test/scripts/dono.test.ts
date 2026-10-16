import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import * as contas from '../../src/infraestrutura/db/repositorios/contas.js';
import * as sessoes from '../../src/infraestrutura/db/repositorios/sessoes.js';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { executarSql } from '../apoio/sql.js';
import { URL_BANCO_TESTE } from '../apoio/url-teste.js';

// Cada teste sobe `pnpm exec tsx` num processo novo, lento no Windows.
vi.setConfig({ testTimeout: 60_000 });

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const RAIZ = join(import.meta.dirname, '../../../..');
const EMAIL = 'leandrosegheto17@gmail.com';

function dono(comando: string, opcoes: { digitado?: string; env?: Record<string, string | undefined> } = {}) {
  const resultado = spawnSync('pnpm', ['exec', 'tsx', 'backend/scripts/dono.ts', comando], {
    cwd: RAIZ,
    input: `${opcoes.digitado ?? EMAIL}\n`,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, DATABASE_URL: URL_BANCO_TESTE, DONO_EMAIL: EMAIL, ...opcoes.env },
  });
  return { codigo: resultado.status, saida: resultado.stdout, erro: resultado.stderr };
}

async function limparDono() {
  await executarSql('DELETE FROM sessoes WHERE conta_id IN (SELECT id FROM contas WHERE e_dono)');
  await executarSql('DELETE FROM auditoria WHERE entidade_id IN (SELECT id::text FROM contas WHERE e_dono)');
  await executarSql('DELETE FROM contas WHERE e_dono');
}

describe('backend/scripts/dono.ts', () => {
  it('criar: conta e_dono temporária, auditoria de infraestrutura e senha impressa uma vez', async () => {
    fabrica.registrar(limparDono);
    const r = dono('criar');
    expect(r.codigo).toBe(0);
    const senha = /: (\S+)\s*$/.exec(r.saida.trim())?.[1] ?? '';
    expect(senha).toHaveLength(12);
    expect(r.saida.split(senha)).toHaveLength(2);
    const linhas = await executarSql<{ e_dono: boolean; senha_temporaria: boolean }>(
      'SELECT e_dono, senha_temporaria FROM contas WHERE email = $1',
      [EMAIL],
    );
    expect(linhas).toEqual([{ e_dono: true, senha_temporaria: true }]);
    const auditoria = await executarSql<{ autor_tipo: string }>(
      "SELECT autor_tipo FROM auditoria WHERE acao = 'dono_criado'",
    );
    expect(auditoria.map((a) => a.autor_tipo)).toContain('infraestrutura');
    expect(dono('criar').codigo).toBe(1);
  });

  it('e-mail digitado diferente não toca o banco', async () => {
    fabrica.registrar(limparDono);
    const r = dono('criar', { digitado: 'outro@exemplo.com' });
    expect(r.codigo).toBe(1);
    expect(await executarSql('SELECT 1 FROM contas WHERE e_dono')).toEqual([]);
  });

  it('redefinir-senha: nova senha vale, a antiga não, e as sessões do dono caem', async () => {
    fabrica.registrar(limparDono);
    const criado = dono('criar');
    const antiga = /: (\S+)\s*$/.exec(criado.saida.trim())?.[1] ?? '';
    const db = await abrir();
    const conta = await contas.buscarPorEmail(db, EMAIL);
    const hash = new Uint8Array(32).fill(7);
    await sessoes.criar(db, {
      contaId: conta?.id as string,
      tokenHash: hash,
      escopo: 'completo',
      agora: new Date('2026-10-16T12:00:00Z'),
    });

    const r = dono('redefinir-senha');
    expect(r.codigo).toBe(0);
    const nova = /: (\S+)\s*$/.exec(r.saida.trim())?.[1] ?? '';
    expect(await contas.verificarSenha(db, EMAIL, nova)).not.toBeNull();
    expect(await contas.verificarSenha(db, EMAIL, antiga)).toBeNull();
    const restantes = await kyselyDe(db)
      .selectFrom('sessoes')
      .select('id')
      .where('conta_id', '=', conta?.id as string)
      .execute();
    expect(restantes).toEqual([]);
  });

  it('DONO_EMAIL ausente ou inválido: código 1; host remoto sem --alvo: recusa antes de conectar', () => {
    expect(dono('criar', { env: { DONO_EMAIL: '' } }).codigo).toBe(1);
    expect(dono('criar', { env: { DONO_EMAIL: 'x' } }).codigo).toBe(1);
    const remoto = dono('criar', { env: { DATABASE_URL: 'postgres://u:s@ep-x.aws.neon.tech/x' } });
    expect(remoto.codigo).toBe(1);
    expect(remoto.erro).not.toContain(':s@');
  });
});
