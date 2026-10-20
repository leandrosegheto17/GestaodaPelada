import { describe, expect, it, vi } from 'vitest';
import { editarLancamento } from '../../../../src/aplicacao/financeiro/lancamentos/editar.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as auditoria from '../../../../src/infraestrutura/db/repositorios/auditoria.js';
import * as financeiro from '../../../../src/infraestrutura/db/repositorios/financeiro.js';
import { usarDb } from '../../../apoio/db-teste.js';
import { criarConta } from '../../../apoio/fabricas/contas.js';
import { criarLancamento } from '../../../apoio/fabricas/financeiro.js';
import { criarGrupo, vincularAdmin } from '../../../apoio/fabricas/grupos.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const agora = new Date(relogioFixo('2026-10-22').agoraIso());
const NOVO = { tipo: 'saida', data: '2026-10-06', descricao: 'Bola nova', valorCentavos: 12_300 } as const;

async function cenario() {
  const db = await abrir();
  const admin = await criarConta(db, fabrica);
  const grupo = await criarGrupo(db, fabrica, { criadoPor: admin.id });
  await vincularAdmin(db, grupo.id, admin.id, { acessaFinanceiro: true });
  const id = await criarLancamento(db, grupo.id, admin.id);
  return { db, admin, grupo, id, ctx: { autorContaId: admin.id, agora } };
}

describe('editarLancamento', () => {
  it('grava os campos e uma auditoria com valor antes e depois, sem a descrição', async () => {
    const { db, grupo, id, ctx } = await cenario();
    const r = await editarLancamento(db, grupo.id, id, NOVO, ctx);
    expect(r).toMatchObject({ tipo: 'ok', lancamento: { ...NOVO, mensalidade: false } });
    const linhas = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'resumo'])
      .where('grupo_id', '=', grupo.id)
      .execute();
    expect(linhas).toEqual([
      {
        acao: 'lancamento_editado',
        resumo: { valorAntes: 80_000, valorDepois: 12_300, tipo: 'saida', data: '2026-10-06', mensalidade: false },
      },
    ]);
  });

  it('falha na auditoria desfaz a edição', async () => {
    const { db, grupo, id, ctx } = await cenario();
    const espiao = vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));
    await expect(editarLancamento(db, grupo.id, id, NOVO, ctx)).rejects.toThrow('auditoria fora');
    espiao.mockRestore();
    expect((await financeiro.buscarLancamento(db, grupo.id, id))?.valorCentavos).toBe(80_000);
  });

  it('inexistente: nao_encontrado', async () => {
    const { db, grupo, ctx } = await cenario();
    expect(await editarLancamento(db, grupo.id, '00000000-0000-4000-8000-000000000000', NOVO, ctx)).toEqual({
      tipo: 'nao_encontrado',
    });
  });
});
