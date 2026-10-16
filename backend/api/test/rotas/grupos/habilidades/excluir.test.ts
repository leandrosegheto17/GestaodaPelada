import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as habilidades from '../../../../src/infraestrutura/db/repositorios/habilidades.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo('2026-10-22'), semCsrf, ...(cookie ? { cookie } : {}) });

describe('DELETE /api/grupos/:g/habilidades/:id (workerd)', () => {
  it('204: apaga a habilidade e as notas de todos os jogadores nela, com auditoria só do nome', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const passe = await habilidades.criar(db, g, 'Passe');
    const chute = await habilidades.criar(db, g, 'Chute');
    const a = await criarJogador(db, g, cen.adminA.id);
    const b = await criarJogador(db, g, cen.adminA.id);
    for (const j of [a, b]) {
      await habilidades.gravarNota(db, g, j, passe, 7);
      await habilidades.gravarNota(db, g, j, chute, 6);
    }

    const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/habilidades/${passe}`);
    expect(r.status).toBe(204);
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect((await habilidades.listar(db, g)).map((h) => h.id)).toEqual([chute]);
    const notas = await habilidades.notasDoGrupo(db, g);
    expect(notas.map((n) => n.habilidadeId)).toEqual([chute, chute]);

    const auditoria = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'autor_conta_id', 'resumo'])
      .where('grupo_id', '=', g)
      .execute();
    expect(auditoria).toEqual([
      { acao: 'habilidade_excluida', autor_conta_id: cen.adminA.id, resumo: { nome: 'Passe' } },
    ]);
  });

  it('inexistente, repetida e malformada: 404 sem auditoria', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await habilidades.criar(db, g, 'Passe');
    expect((await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/habilidades/${id}`)).status).toBe(204);
    expect((await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/habilidades/${id}`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/habilidades/nao-e-uuid`)).status).toBe(404);
    const linhas = await kyselyDe(db).selectFrom('auditoria').select('id').where('grupo_id', '=', g).execute();
    expect(linhas).toHaveLength(1);
  });

  it('habilidade de B pedida em A: 404 e habilidade e notas de B intactas, sem auditoria', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const doB = await habilidades.criar(db, cen.grupoB.id, 'Drible');
    const jogadorB = await criarJogador(db, cen.grupoB.id, cen.adminB.id);
    await habilidades.gravarNota(db, cen.grupoB.id, jogadorB, doB, 9);
    const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${cen.grupoA.id}/habilidades/${doB}`);
    expect(r.status).toBe(404);
    expect(await habilidades.listar(db, cen.grupoB.id)).toHaveLength(1);
    expect(await habilidades.notasDoGrupo(db, cen.grupoB.id)).toHaveLength(1);
    const linhas = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('id')
      .where('grupo_id', '=', cen.grupoB.id)
      .execute();
    expect(linhas).toEqual([]);
  });

  it('sem X-Pelada 403; sem sessão 401; admin de B em A 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await habilidades.criar(db, g, 'Passe');
    expect((await cliente(cen.adminA.cookie, true).delete(`/api/grupos/${g}/habilidades/${id}`)).status).toBe(403);
    expect((await cliente().delete(`/api/grupos/${g}/habilidades/${id}`)).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).delete(`/api/grupos/${g}/habilidades/${id}`)).status).toBe(404);
    expect(await habilidades.listar(db, g)).toHaveLength(1);
  });
});
