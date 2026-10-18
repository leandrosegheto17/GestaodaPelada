import { describe, expect, it, vi } from 'vitest';
import { AcaoNaPropriaConta, AdminNaoEncontrado } from '../../../../src/aplicacao/grupos/admins/erros.js';
import { alterarFinanceiroAdmin } from '../../../../src/aplicacao/grupos/admins/financeiro.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as auditoria from '../../../../src/infraestrutura/db/repositorios/auditoria.js';
import { usarDb } from '../../../apoio/db-teste.js';
import { criarConta } from '../../../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../../../apoio/fabricas/grupos.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const agora = new Date(relogioFixo('2026-10-16').agoraIso());

async function cenario() {
  const db = await abrir();
  const autor = await criarConta(db, fabrica);
  const alvo = await criarConta(db, fabrica);
  const grupo = await criarGrupo(db, fabrica, { criadoPor: autor.id });
  await vincularAdmin(db, grupo.id, autor.id, { acessaFinanceiro: true });
  await vincularAdmin(db, grupo.id, alvo.id, { acessaFinanceiro: false });
  const estado = async () =>
    (
      await kyselyDe(db)
        .selectFrom('vinculos_admin')
        .select('acessa_financeiro')
        .where('grupo_id', '=', grupo.id)
        .where('conta_id', '=', alvo.id)
        .executeTakeFirstOrThrow()
    ).acessa_financeiro;
  const acoes = async () =>
    (
      await kyselyDe(db).selectFrom('auditoria').select('acao').where('grupo_id', '=', grupo.id).orderBy('id').execute()
    ).map((a) => a.acao);
  return { db, autor, alvo, grupo, estado, acoes };
}

describe('alterarFinanceiroAdmin', () => {
  it('concede e retira com auditoria; mesmo valor não audita de novo', async () => {
    const { db, autor, alvo, grupo, estado, acoes } = await cenario();
    const base = { alvoContaId: alvo.id, autorContaId: autor.id, agora };
    await alterarFinanceiroAdmin(db, grupo.id, { ...base, valor: true });
    await alterarFinanceiroAdmin(db, grupo.id, { ...base, valor: true });
    expect(await estado()).toBe(true);
    await alterarFinanceiroAdmin(db, grupo.id, { ...base, valor: false });
    expect(await estado()).toBe(false);
    expect(await acoes()).toEqual(['financeiro_concedido', 'financeiro_retirado']);
  });

  it('recusa a própria conta e alvo fora do grupo, sem alterar nada', async () => {
    const { db, autor, grupo, acoes } = await cenario();
    const outro = await criarConta(db, fabrica);
    await expect(
      alterarFinanceiroAdmin(db, grupo.id, { alvoContaId: autor.id, autorContaId: autor.id, valor: false, agora }),
    ).rejects.toBeInstanceOf(AcaoNaPropriaConta);
    await expect(
      alterarFinanceiroAdmin(db, grupo.id, { alvoContaId: outro.id, autorContaId: autor.id, valor: true, agora }),
    ).rejects.toBeInstanceOf(AdminNaoEncontrado);
    expect(await acoes()).toEqual([]);
  });

  it('falha na auditoria desfaz a mudança de permissão', async () => {
    const { db, autor, alvo, grupo, estado, acoes } = await cenario();
    const espiao = vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));
    await expect(
      alterarFinanceiroAdmin(db, grupo.id, { alvoContaId: alvo.id, autorContaId: autor.id, valor: true, agora }),
    ).rejects.toThrow('auditoria fora');
    espiao.mockRestore();
    expect(await estado()).toBe(false);
    expect(await acoes()).toEqual([]);
  });
});
