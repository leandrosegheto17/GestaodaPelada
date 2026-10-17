import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  arquivarGrupo,
  GrupoNaoEncontrado,
  NomeNaoConfere,
  reativarGrupo,
} from '../../../src/aplicacao/dono/arquivamento.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import * as grupos from '../../../src/infraestrutura/db/repositorios/grupos.js';
import * as vinculos from '../../../src/infraestrutura/db/repositorios/vinculos.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarConta } from '../../apoio/fabricas/contas.js';
import { criarGrupo, vincularAdmin } from '../../apoio/fabricas/grupos.js';
import { usarFabrica } from '../../apoio/fabrica.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');
const OUTRA = new Date('2026-10-20T12:00:00Z');

async function preparar() {
  const db = await abrir();
  const dono = await criarConta(db, fabrica);
  const admin = await criarConta(db, fabrica);
  const grupo = await criarGrupo(db, fabrica, { criadoPor: admin.id, nome: 'Racha Arquivo' });
  await vincularAdmin(db, grupo.id, admin.id, { acessaFinanceiro: false });
  const acoes = () =>
    kyselyDe(db).selectFrom('auditoria').select(['acao', 'autor_conta_id']).where('grupo_id', '=', grupo.id).execute();
  return { db, dono, admin, grupo, acoes };
}

describe('arquivarGrupo', () => {
  it('nome exato arquiva, audita com o dono como autor e tira o grupo da lista do admin', async () => {
    const { db, dono, admin, grupo, acoes } = await preparar();
    await arquivarGrupo(db, grupo.id, { nomeConfirmacao: 'Racha Arquivo', autorId: dono.id, agora: AGORA });
    const g = await grupos.buscarPorSlug(db, grupo.slug);
    expect(g?.arquivadoEm).toEqual(AGORA);
    expect(await acoes()).toEqual([{ acao: 'grupo_arquivado', autor_conta_id: dono.id }]);
    expect(await vinculos.gruposDaConta(db, admin.id)).toHaveLength(0);

    await reativarGrupo(db, grupo.id, { autorId: dono.id, agora: OUTRA });
    expect((await grupos.buscarPorSlug(db, grupo.slug))?.arquivadoEm).toBeNull();
    expect(await vinculos.gruposDaConta(db, admin.id)).toHaveLength(1);
    expect((await acoes()).map((a) => a.acao).sort()).toEqual(['grupo_arquivado', 'grupo_reativado']);
  });

  it.each(['racha arquivo', 'Racha Arquivo ', ' Racha Arquivo', '', 'Racha'])(
    'nome %j não confere: nada muda e nada é auditado',
    async (nome) => {
      const { db, dono, grupo, acoes } = await preparar();
      await expect(
        arquivarGrupo(db, grupo.id, { nomeConfirmacao: nome, autorId: dono.id, agora: AGORA }),
      ).rejects.toThrow(NomeNaoConfere);
      expect((await grupos.buscarPorId(db, grupo.id))?.arquivadoEm).toBeNull();
      expect(await acoes()).toEqual([]);
    },
  );

  it('arquivar de novo mantém a data original e uma só auditoria', async () => {
    const { db, dono, grupo, acoes } = await preparar();
    const e = { nomeConfirmacao: 'Racha Arquivo', autorId: dono.id };
    await arquivarGrupo(db, grupo.id, { ...e, agora: AGORA });
    await arquivarGrupo(db, grupo.id, { ...e, agora: OUTRA });
    expect((await grupos.buscarPorId(db, grupo.id))?.arquivadoEm).toEqual(AGORA);
    expect(await acoes()).toHaveLength(1);
  });

  it('reativar grupo ativo não audita', async () => {
    const { db, dono, grupo, acoes } = await preparar();
    await reativarGrupo(db, grupo.id, { autorId: dono.id, agora: AGORA });
    expect(await acoes()).toEqual([]);
  });

  it('falha na auditoria (autor inexistente) desfaz o arquivamento', async () => {
    const { db, grupo, acoes } = await preparar();
    await expect(
      arquivarGrupo(db, grupo.id, { nomeConfirmacao: 'Racha Arquivo', autorId: randomUUID(), agora: AGORA }),
    ).rejects.toThrow();
    expect((await grupos.buscarPorId(db, grupo.id))?.arquivadoEm).toBeNull();
    expect(await acoes()).toEqual([]);
  });

  it('grupo inexistente', async () => {
    const { db, dono } = await preparar();
    await expect(
      arquivarGrupo(db, randomUUID(), { nomeConfirmacao: 'x', autorId: dono.id, agora: AGORA }),
    ).rejects.toThrow(GrupoNaoEncontrado);
    await expect(reativarGrupo(db, randomUUID(), { autorId: dono.id, agora: AGORA })).rejects.toThrow(
      GrupoNaoEncontrado,
    );
  });
});
