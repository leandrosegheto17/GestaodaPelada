import { erroJogadorComHistorico, jogadorDetalhe } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { emTransacao } from '../../../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as habilidades from '../../../../src/infraestrutura/db/repositorios/habilidades.js';
import * as partidas from '../../../../src/infraestrutura/db/repositorios/partidas.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const HOJE = '2026-10-22';
const AGORA = new Date('2026-10-22T15:00:00Z');
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo(HOJE), cookie });

describe('inativar e reativar (workerd)', () => {
  it('inativa na data pedida (padrão hoje), recusa futura e anterior à entrada, e já inativo dá 409', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-02-05' });
    const url = `/api/grupos/${g}/jogadores/${id}/inativar`;
    expect((await cliente(cen.adminA.cookie).post(url, { dataSaida: '2026-10-23' })).status).toBe(422);
    expect((await cliente(cen.adminA.cookie).post(url, { dataSaida: '2026-02-04' })).status).toBe(422);
    const r = await cliente(cen.adminA.cookie).post(url, {});
    expect(r.status).toBe(200);
    expect(jogadorDetalhe.parse(r.corpo).situacao).toEqual({ ativo: false, desde: HOJE });
    const denovo = await cliente(cen.adminA.cookie).post(url, {});
    expect(denovo.status).toBe(409);
    expect(denovo.corpo).toMatchObject({ erro: { codigo: 'jogador_ja_inativo' } });
  });

  it('reativa a partir de hoje, mantém o período anterior, recusa já ativo e permite reativar no mesmo dia', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: '2026-02-05' });
    const ativo = await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${id}/reativar`);
    expect(ativo.status).toBe(409);
    expect(ativo.corpo).toMatchObject({ erro: { codigo: 'jogador_ja_ativo' } });
    await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${id}/inativar`, { dataSaida: HOJE });
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${id}/reativar`);
    expect(r.status).toBe(200);
    expect(jogadorDetalhe.parse(r.corpo).situacao).toEqual({ ativo: true, desde: HOJE });
    const periodos = await kyselyDe(db)
      .selectFrom('periodos_ativos')
      .select(['inicio', 'fim'])
      .where('jogador_id', '=', id)
      .orderBy('inicio')
      .execute();
    expect(periodos).toEqual([
      { inicio: '2026-02-05', fim: HOJE },
      { inicio: HOJE, fim: null },
    ]);
  });

  it('jogador de outro grupo, inexistente e malformado: 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const id = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
    for (const acao of ['inativar', 'reativar']) {
      expect(
        (await cliente(cen.adminB.cookie).post(`/api/grupos/${cen.grupoB.id}/jogadores/${id}/${acao}`, {})).status,
      ).toBe(404);
      expect(
        (await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/jogadores/${randomUUID()}/${acao}`, {}))
          .status,
      ).toBe(404);
      expect(
        (await cliente(cen.adminA.cookie).post(`/api/grupos/${cen.grupoA.id}/jogadores/abc/${acao}`, {})).status,
      ).toBe(404);
    }
  });
});

describe('DELETE /api/grupos/:g/jogadores/:id (workerd)', () => {
  it('sem histórico: 204 e auditoria só com o apelido', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Apagar' });
    const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/jogadores/${id}`);
    expect(r.status).toBe(204);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores/${id}`)).status).toBe(404);
    const auditoria = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'resumo'])
      .where('grupo_id', '=', g)
      .execute();
    expect(auditoria).toEqual([{ acao: 'jogador_excluido', resumo: { apelido: 'Apagar' } }]);
  });

  it('com presença ou com nota: 409 jogador_com_historico e nada some', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const comPresenca = await criarJogador(db, g, cen.adminA.id, { apelido: 'ComPresenca' });
    const comNota = await criarJogador(db, g, cen.adminA.id, { apelido: 'ComNota' });
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, {
        data: '2026-10-15',
        choveu: false,
        presencas: [{ jogadorId: comPresenca, situacao: 'presente' }],
        autor: cen.adminA.id,
        agora: AGORA,
      }),
    );
    const hab = await habilidades.criar(db, g, 'Passe');
    await habilidades.gravarNota(db, g, comNota, hab, 7);
    for (const [id, apelido] of [
      [comPresenca, 'ComPresenca'],
      [comNota, 'ComNota'],
    ] as const) {
      const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/jogadores/${id}`);
      expect(r.status).toBe(409);
      expect(erroJogadorComHistorico.safeParse(r.corpo).success).toBe(true);
      expect(r.corpo).toMatchObject({
        erro: { mensagem: `${apelido} tem histórico de partidas e não pode ser excluído.`, sugestao: 'inativar' },
      });
      expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores/${id}`)).status).toBe(200);
    }
    expect(await kyselyDe(db).selectFrom('auditoria').select('id').where('grupo_id', '=', g).execute()).toEqual([]);
  });

  it('outro grupo e malformado: 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const id = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
    expect((await cliente(cen.adminB.cookie).delete(`/api/grupos/${cen.grupoB.id}/jogadores/${id}`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(`/api/grupos/${cen.grupoA.id}/jogadores/abc`)).status).toBe(404);
  });
});
