import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../src/infraestrutura/db/index.js';
import * as auditoria from '../../src/infraestrutura/db/repositorios/auditoria.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConta } from '../apoio/fabricas/contas.js';
import { criarGrupo } from '../apoio/fabricas/grupos.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { relogioFixo } from '../apoio/relogio.js';
import { executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const t0 = new Date(relogioFixo('2026-10-16', '10:00').agoraIso());

describe('repositório de auditoria', () => {
  it('grava autor de conta e de infraestrutura, com e sem grupo', async () => {
    const db = await abrir();
    const conta = await criarConta(db, fabrica);
    const grupo = await criarGrupo(db, fabrica, { criadoPor: conta.id });
    fabrica.registrar(async () => {
      await executarSql("DELETE FROM auditoria WHERE entidade = 'teste-auditoria'");
    });
    await auditoria.registrar(db, grupo.id, {
      autor: { tipo: 'conta', contaId: conta.id },
      acao: 'criar',
      entidade: 'teste-auditoria',
      resumo: { nome: 'x' },
      agora: t0,
    });
    await auditoria.registrar(db, null, {
      autor: { tipo: 'infraestrutura' },
      acao: 'script',
      entidade: 'teste-auditoria',
      agora: t0,
    });
    const linhas = await executarSql<{ autor_tipo: string; autor_conta_id: string | null; grupo_id: string | null }>(
      "SELECT autor_tipo, autor_conta_id, grupo_id FROM auditoria WHERE entidade = 'teste-auditoria' ORDER BY id",
    );
    expect(linhas).toEqual([
      { autor_tipo: 'conta', autor_conta_id: conta.id, grupo_id: grupo.id },
      { autor_tipo: 'infraestrutura', autor_conta_id: null, grupo_id: null },
    ]);
  });

  it.each([
    'senha',
    'senhaNova',
    'novaSenha',
    'token',
    'resetToken',
    'hash',
    'password_hash',
    'password',
    'telefone',
    'telefoneContato',
  ])('recusa a chave %s no resumo', async (chave) => {
    const db = await abrir();
    await expect(
      auditoria.registrar(db, null, {
        autor: { tipo: 'infraestrutura' },
        acao: 'x',
        entidade: 'teste-auditoria',
        resumo: { [chave]: 'valor' },
        agora: t0,
      }),
    ).rejects.toThrow();
  });

  it('dentro de uma transação que lança, nada é gravado', async () => {
    const db = await abrir();
    await expect(
      emTransacao(db, async (tx) => {
        await auditoria.registrar(tx, null, {
          autor: { tipo: 'infraestrutura' },
          acao: 'rollback',
          entidade: 'teste-rollback',
          agora: t0,
        });
        throw new Error('falha');
      }),
    ).rejects.toThrow('falha');
    expect(await executarSql("SELECT 1 FROM auditoria WHERE entidade = 'teste-rollback'")).toEqual([]);
  });
});
