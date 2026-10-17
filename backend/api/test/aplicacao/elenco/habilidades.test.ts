import { describe, expect, it, vi } from 'vitest';
import { criarHabilidade, excluirHabilidade, renomearHabilidade } from '../../../src/aplicacao/elenco/habilidades.js';
import { MSG_HABILIDADE_EM_USO } from '../../../src/aplicacao/elenco/mensagens.js';
import * as auditoria from '../../../src/infraestrutura/db/repositorios/auditoria.js';
import * as habilidades from '../../../src/infraestrutura/db/repositorios/habilidades.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { relogioFixo } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

describe('renomearHabilidade (workerd)', () => {
  it('renomeia; nome de outra do grupo vira erro do campo; habilidade de outro grupo é null', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const passe = await habilidades.criar(db, cen.grupoA.id, 'Passe');
    await habilidades.criar(db, cen.grupoA.id, 'Chute');
    const doB = await habilidades.criar(db, cen.grupoB.id, 'Drible');
    expect(await renomearHabilidade(db, cen.grupoA.id, passe, 'Passe longo')).toEqual({
      ok: true,
      habilidade: { id: passe, nome: 'Passe longo' },
    });
    expect(await renomearHabilidade(db, cen.grupoA.id, passe, 'CHUTE')).toEqual({
      ok: false,
      campos: { nome: MSG_HABILIDADE_EM_USO },
    });
    expect(await renomearHabilidade(db, cen.grupoA.id, doB, 'Invasor')).toBeNull();
  });
});

describe('criarHabilidade (workerd)', () => {
  it('cria e devolve o id', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const r = await criarHabilidade(db, cen.grupoA.id, 'Passe');
    expect(r.ok && r.habilidade.nome).toBe('Passe');
    expect(await habilidades.listar(db, cen.grupoA.id)).toHaveLength(1);
  });

  it('nome repetido sem distinguir caixa vira erro do campo nome; em outro grupo é permitido', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    await criarHabilidade(db, cen.grupoA.id, 'Passe');
    const repetido = await criarHabilidade(db, cen.grupoA.id, 'passe');
    expect(repetido).toEqual({ ok: false, campos: { nome: MSG_HABILIDADE_EM_USO } });
    expect((await criarHabilidade(db, cen.grupoB.id, 'passe')).ok).toBe(true);
  });
});

describe('excluirHabilidade (workerd)', () => {
  const agora = new Date(relogioFixo('2026-10-22').agoraIso());

  it('apaga a habilidade e as notas dela; habilidade de outro grupo ou inexistente é null', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const passe = await habilidades.criar(db, g, 'Passe');
    const chute = await habilidades.criar(db, g, 'Chute');
    const doB = await habilidades.criar(db, cen.grupoB.id, 'Drible');
    const j = await criarJogador(db, g, cen.adminA.id);
    await habilidades.gravarNota(db, g, j, passe, 7);
    await habilidades.gravarNota(db, g, j, chute, 6);
    const ctx = { autorContaId: cen.adminA.id, agora };
    expect(await excluirHabilidade(db, g, doB, ctx)).toBeNull();
    expect(await habilidades.listar(db, cen.grupoB.id)).toHaveLength(1);
    expect(await excluirHabilidade(db, g, passe, ctx)).toEqual({ nome: 'Passe' });
    expect(await excluirHabilidade(db, g, passe, ctx)).toBeNull();
    expect((await habilidades.notasDoGrupo(db, g)).map((n) => n.habilidadeId)).toEqual([chute]);
  });

  it('falha na auditoria desfaz a exclusão e as notas continuam', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const passe = await habilidades.criar(db, g, 'Passe');
    const j = await criarJogador(db, g, cen.adminA.id);
    await habilidades.gravarNota(db, g, j, passe, 7);
    const espiao = vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));
    await expect(excluirHabilidade(db, g, passe, { autorContaId: cen.adminA.id, agora })).rejects.toThrow(
      'auditoria fora',
    );
    espiao.mockRestore();
    expect(await habilidades.listar(db, g)).toHaveLength(1);
    expect(await habilidades.notasDoGrupo(db, g)).toHaveLength(1);
  });
});
