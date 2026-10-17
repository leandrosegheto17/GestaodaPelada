import { describe, expect, it, vi } from 'vitest';
import { AdminNaoEncontrado, RemoverASiMesmo, UltimoAdmin } from '../../../../src/aplicacao/grupos/admins/erros.js';
import { removerAdmin } from '../../../../src/aplicacao/grupos/admins/remover.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as auditoria from '../../../../src/infraestrutura/db/repositorios/auditoria.js';
import { usarDb } from '../../../apoio/db-teste.js';
import { criarConta } from '../../../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../../../apoio/fabricas/grupos.js';
import { usarFabrica } from '../../../apoio/fabrica.js';

vi.mock('../../../../src/infraestrutura/db/repositorios/auditoria.js', async (original) => {
  const real = await original<typeof import('../../../../src/infraestrutura/db/repositorios/auditoria.js')>();
  return { ...real, registrar: vi.fn(real.registrar) };
});

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');

async function grupoCom(n: number) {
  const db = await abrir();
  const contas = [];
  for (let i = 0; i < n; i++) contas.push(await criarConta(db, fabrica, { nome: `Admin ${i}` }));
  const grupo = await criarGrupo(db, fabrica, { criadoPor: contas[0]!.id, nome: 'Grupo' });
  for (const conta of contas) await vincularAdmin(db, grupo.id, conta.id);
  return { db, grupo, contas };
}

const totalVinculos = async (db: Awaited<ReturnType<typeof abrir>>, grupoId: string) =>
  (await kyselyDe(db).selectFrom('vinculos_admin').select('conta_id').where('grupo_id', '=', grupoId).execute()).length;
const acoes = async (db: Awaited<ReturnType<typeof abrir>>, grupoId: string) =>
  (await kyselyDe(db).selectFrom('auditoria').select('acao').where('grupo_id', '=', grupoId).execute()).map(
    (a) => a.acao,
  );

describe('removerAdmin', () => {
  it('remove o vínculo do alvo e audita com o autor', async () => {
    const { db, grupo, contas } = await grupoCom(2);
    await removerAdmin(db, grupo.id, { alvoContaId: contas[1]!.id, autorContaId: contas[0]!.id, agora: AGORA });
    expect(await totalVinculos(db, grupo.id)).toBe(1);
    const linhas = await kyselyDe(db).selectFrom('auditoria').selectAll().where('grupo_id', '=', grupo.id).execute();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ acao: 'admin_removido', entidade: 'conta', entidade_id: contas[1]!.id });
    expect(JSON.stringify(linhas[0])).not.toMatch(/@/);
  });

  it('remover a si mesmo: RemoverASiMesmo, vínculo intacto e nada auditado', async () => {
    const { db, grupo, contas } = await grupoCom(2);
    await expect(
      removerAdmin(db, grupo.id, { alvoContaId: contas[0]!.id, autorContaId: contas[0]!.id, agora: AGORA }),
    ).rejects.toBeInstanceOf(RemoverASiMesmo);
    expect(await totalVinculos(db, grupo.id)).toBe(2);
    expect(await acoes(db, grupo.id)).toEqual([]);
  });

  it('último admin: UltimoAdmin e o vínculo continua', async () => {
    const { db, grupo, contas } = await grupoCom(1);
    const outra = await criarConta(db, fabrica);
    await expect(
      removerAdmin(db, grupo.id, { alvoContaId: contas[0]!.id, autorContaId: outra.id, agora: AGORA }),
    ).rejects.toBeInstanceOf(UltimoAdmin);
    expect(await totalVinculos(db, grupo.id)).toBe(1);
  });

  it('corrida A remove B e B remove A: exatamente uma passa e sobra 1 admin', async () => {
    const { db, grupo, contas } = await grupoCom(2);
    const [a, b] = [contas[0]!.id, contas[1]!.id];
    const db2 = await abrir();
    const resultados = await Promise.allSettled([
      removerAdmin(db, grupo.id, { alvoContaId: b, autorContaId: a, agora: AGORA }),
      removerAdmin(db2, grupo.id, { alvoContaId: a, autorContaId: b, agora: AGORA }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const falha = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect([UltimoAdmin, AdminNaoEncontrado].some((E) => falha.reason instanceof E)).toBe(true);
    expect(await totalVinculos(db, grupo.id)).toBe(1);
  });

  it('alvo sem vínculo neste grupo: AdminNaoEncontrado e o vínculo dele no outro grupo intacto', async () => {
    const { db, grupo, contas } = await grupoCom(2);
    const outro = await grupoCom(1);
    await expect(
      removerAdmin(db, grupo.id, { alvoContaId: outro.contas[0]!.id, autorContaId: contas[0]!.id, agora: AGORA }),
    ).rejects.toBeInstanceOf(AdminNaoEncontrado);
    expect(await totalVinculos(db, outro.grupo.id)).toBe(1);
    expect(await totalVinculos(db, grupo.id)).toBe(2);
  });

  it('atomicidade: auditoria que lança desfaz a remoção', async () => {
    const { db, grupo, contas } = await grupoCom(2);
    vi.mocked(auditoria.registrar).mockRejectedValueOnce(new Error('falha'));
    await expect(
      removerAdmin(db, grupo.id, { alvoContaId: contas[1]!.id, autorContaId: contas[0]!.id, agora: AGORA }),
    ).rejects.toThrow('falha');
    expect(await totalVinculos(db, grupo.id)).toBe(2);
  });
});
