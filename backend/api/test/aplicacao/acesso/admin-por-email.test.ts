import { randomBytes } from 'node:crypto';
import { adminAdicionado } from '@pelada/contrato';
import { describe, expect, it, vi } from 'vitest';
import {
  AdminJaVinculado,
  vincularOuCriarAdmin,
  vincularOuCriarAdminEmTransacao,
} from '../../../src/aplicacao/acesso/admin-por-email.js';
import { emTransacao } from '../../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as contas from '../../../src/infraestrutura/db/repositorios/contas.js';
import * as vinculos from '../../../src/infraestrutura/db/repositorios/vinculos.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarConta } from '../../apoio/fabricas/contas.js';
import { criarGrupo } from '../../apoio/fabricas/grupos.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';
import { executarSql } from '../../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const agora = new Date(relogioFixo('2026-10-16').agoraIso());
const emailNovo = () => `admin-${randomBytes(4).toString('hex')}@teste.invalid`;

async function limparConta(contaId: string, db: Awaited<ReturnType<typeof abrir>>) {
  const banco = kyselyDe(db);
  await banco.deleteFrom('auditoria').where('entidade_id', '=', contaId).execute();
  await banco.deleteFrom('vinculos_admin').where('conta_id', '=', contaId).execute();
  await banco.deleteFrom('contas').where('id', '=', contaId).execute();
}

describe('vincularOuCriarAdmin', () => {
  it.each([true, false])('e-mail novo cria a conta com senha temporária (financeiro=%s)', async (financeiro) => {
    const db = await abrir();
    const dono = await criarConta(db, fabrica);
    const grupo = await criarGrupo(db, fabrica, { criadoPor: dono.id });
    const email = emailNovo();
    const r = await vincularOuCriarAdminEmTransacao(
      db,
      grupo.id,
      { nome: 'Novo Admin', email, acessaFinanceiro: financeiro },
      { tipo: 'conta', contaId: dono.id },
      agora,
    );
    fabrica.registrar(() => limparConta(r.contaId, db));
    expect(r).toMatchObject({ contaNova: true, nome: 'Novo Admin' });
    expect(r.senhaTemporaria).toHaveLength(12);
    const conta = await contas.buscarPorEmail(db, email);
    expect(conta?.senhaTemporaria).toBe(true);
    expect((await vinculos.buscar(db, grupo.id, r.contaId))?.acessaFinanceiro).toBe(financeiro);
    expect(await contas.verificarSenha(db, email, r.senhaTemporaria as string)).not.toBeNull();
    const auditoria = await executarSql<{ acao: string }>('SELECT acao FROM auditoria WHERE entidade_id = $1', [
      r.contaId,
    ]);
    expect(auditoria.map((l) => l.acao)).toEqual(['admin_criado']);
  });

  it('e-mail existente só vincula e não mexe na senha', async () => {
    const db = await abrir();
    const dono = await criarConta(db, fabrica);
    const existente = await criarConta(db, fabrica, { nome: 'Já Existia' });
    const grupo = await criarGrupo(db, fabrica, { criadoPor: dono.id });
    const r = await vincularOuCriarAdminEmTransacao(
      db,
      grupo.id,
      { nome: 'Outro Nome', email: existente.email, acessaFinanceiro: false },
      { tipo: 'conta', contaId: dono.id },
      agora,
    );
    expect(r).toEqual({ contaId: existente.id, nome: 'Já Existia', contaNova: false, senhaTemporaria: null });
    expect(await contas.verificarSenha(db, existente.email, existente.senha)).not.toBeNull();
    expect(await vinculos.buscar(db, grupo.id, existente.id)).not.toBeNull();
    const auditoria = await executarSql<{ acao: string }>('SELECT acao FROM auditoria WHERE entidade_id = $1', [
      existente.id,
    ]);
    expect(auditoria.map((l) => l.acao)).toEqual(['admin_vinculado']);
  });

  it('vínculo repetido vira AdminJaVinculado', async () => {
    const db = await abrir();
    const dono = await criarConta(db, fabrica);
    const existente = await criarConta(db, fabrica);
    const grupo = await criarGrupo(db, fabrica, { criadoPor: dono.id });
    const pedir = () =>
      vincularOuCriarAdminEmTransacao(
        db,
        grupo.id,
        { nome: 'X', email: existente.email, acessaFinanceiro: false },
        { tipo: 'conta', contaId: dono.id },
        agora,
      );
    await pedir();
    const antes = await executarSql('SELECT 1 FROM auditoria WHERE entidade_id = $1', [existente.id]);
    await expect(pedir()).rejects.toBeInstanceOf(AdminJaVinculado);
    const depois = await executarSql('SELECT 1 FROM auditoria WHERE entidade_id = $1', [existente.id]);
    expect(depois).toHaveLength(antes.length);
  });

  it('falha ao criar o vínculo desfaz a conta nova', async () => {
    const db = await abrir();
    const dono = await criarConta(db, fabrica);
    const email = emailNovo();
    await expect(
      vincularOuCriarAdminEmTransacao(
        db,
        '00000000-0000-4000-8000-000000000000',
        { nome: 'Fantasma', email, acessaFinanceiro: false },
        { tipo: 'conta', contaId: dono.id },
        agora,
      ),
    ).rejects.toThrow();
    expect(await contas.buscarPorEmail(db, email)).toBeNull();
  });

  it('o núcleo dentro de transação que lança depois não deixa nada', async () => {
    const db = await abrir();
    const dono = await criarConta(db, fabrica);
    const grupo = await criarGrupo(db, fabrica, { criadoPor: dono.id });
    const email = emailNovo();
    await expect(
      emTransacao(db, async (tx) => {
        await vincularOuCriarAdmin(
          tx,
          grupo.id,
          { nome: 'Desfeito', email, acessaFinanceiro: false },
          { tipo: 'conta', contaId: dono.id },
          agora,
        );
        throw new Error('falha depois');
      }),
    ).rejects.toThrow('falha depois');
    expect(await contas.buscarPorEmail(db, email)).toBeNull();
  });

  it('retorno cumpre o contrato e a senha não vai para o console', async () => {
    const db = await abrir();
    const dono = await criarConta(db, fabrica);
    const grupo = await criarGrupo(db, fabrica, { criadoPor: dono.id });
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m));
    const r = await vincularOuCriarAdminEmTransacao(
      db,
      grupo.id,
      { nome: 'Contrato', email: emailNovo(), acessaFinanceiro: false },
      { tipo: 'conta', contaId: dono.id },
      agora,
    );
    fabrica.registrar(() => limparConta(r.contaId, db));
    expect(adminAdicionado.safeParse(r).success).toBe(true);
    for (const e of espioes) expect(e).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
