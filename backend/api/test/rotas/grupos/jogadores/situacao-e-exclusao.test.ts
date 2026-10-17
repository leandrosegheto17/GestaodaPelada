import { erroJogadorComHistorico, jogadorDetalhe } from '@pelada/contrato';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ativosNaData } from '../../../../src/aplicacao/elenco/ativos.js';
import { emTransacao } from '../../../../src/infraestrutura/db/index.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import * as financeiro from '../../../../src/infraestrutura/db/repositorios/financeiro.js';
import * as jogadoresRepo from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as habilidades from '../../../../src/infraestrutura/db/repositorios/habilidades.js';
import * as partidas from '../../../../src/infraestrutura/db/repositorios/partidas.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { AGORA_TESTE, diaRelativo, HOJE_TESTE, relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const HOJE = HOJE_TESTE;
const AGORA = AGORA_TESTE;
const ENTRADA = diaRelativo(-250);
const SAIDA_ANTIGA = diaRelativo(-25);
const PRESENCA = diaRelativo(-2);
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo(HOJE), cookie });

describe('inativar e reativar (workerd)', () => {
  it('inativa na data pedida (padrão hoje), recusa futura e anterior à entrada, e já inativo dá 409', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    const url = `/api/grupos/${g}/jogadores/${id}/inativar`;
    expect((await cliente(cen.adminA.cookie).post(url, { dataSaida: diaRelativo(1) })).status).toBe(422);
    expect((await cliente(cen.adminA.cookie).post(url, { dataSaida: diaRelativo(-251) })).status).toBe(422);
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
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
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
      { inicio: ENTRADA, fim: HOJE },
      { inicio: HOJE, fim: null },
    ]);
  });

  it('reativar: corpo com campo vira 422, {} é aceito e dois pedidos simultâneos dão um 200 e um 409', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    const url = `/api/grupos/${g}/jogadores/${id}/reativar`;
    await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${id}/inativar`, { dataSaida: SAIDA_ANTIGA });
    expect((await cliente(cen.adminA.cookie).post(url, { dataInicio: diaRelativo(-16) })).status).toBe(422);
    const [a, b] = await Promise.all([
      cliente(cen.adminA.cookie).post(url, {}),
      cliente(cen.adminA.cookie).post(url, {}),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const abertos = await kyselyDe(db)
      .selectFrom('periodos_ativos')
      .select('inicio')
      .where('jogador_id', '=', id)
      .where('fim', 'is', null)
      .execute();
    expect(abertos).toHaveLength(1);
  });

  it('inativar: presença na data de saída ou depois dela dá 422 e o período segue aberto; saída depois da presença passa', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, {
        data: PRESENCA,
        choveu: false,
        presencas: [{ jogadorId: id, situacao: 'presente' }],
        autor: cen.adminA.id,
        agora: AGORA,
      }),
    );
    const url = `/api/grupos/${g}/jogadores/${id}/inativar`;
    const r = await cliente(cen.adminA.cookie).post(url, { dataSaida: PRESENCA });
    expect(r.status).toBe(422);
    expect(r.corpo).toMatchObject({ erro: { campos: { dataSaida: expect.any(String) } } });
    expect((await cliente(cen.adminA.cookie).post(url, { dataSaida: diaRelativo(-1) })).status).toBe(200);
  });

  it('inativar: saída igual à entrada e ontem passam; o fim gravado aparece em buscar e o jogador sai de ativosNaData', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const naEntrada = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    const r = await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${naEntrada}/inativar`, {
      dataSaida: ENTRADA,
    });
    expect(r.status).toBe(200);
    expect(jogadorDetalhe.parse(r.corpo).situacao).toEqual({ ativo: false, desde: ENTRADA });

    const ontem = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    const vespera = diaRelativo(-1);
    expect(
      (await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${ontem}/inativar`, { dataSaida: vespera }))
        .status,
    ).toBe(200);
    const gravado = await jogadoresRepo.buscar(db, g, ontem);
    expect(gravado?.periodos).toEqual([{ inicio: ENTRADA, fim: vespera }]);
    expect((await ativosNaData(db, g, diaRelativo(-2))).map((j) => j.id)).toContain(ontem);
    expect((await ativosNaData(db, g, vespera)).map((j) => j.id)).not.toContain(ontem);
    expect((await ativosNaData(db, g, HOJE)).map((j) => j.id)).not.toContain(ontem);
  });

  it('inativar: data inexistente, vazia, malformada e campo extra dão 422 e o período segue aberto', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    const url = `/api/grupos/${g}/jogadores/${id}/inativar`;
    const invalidos: unknown[] = [
      { dataSaida: '2026-02-30' },
      { dataSaida: '' },
      { dataSaida: HOJE.replaceAll('-', '/') },
      { dataSaida: HOJE, extra: 1 },
      { outro: HOJE },
    ];
    for (const corpo of invalidos) {
      expect((await cliente(cen.adminA.cookie).post(url, corpo)).status).toBe(422);
    }
    expect((await jogadoresRepo.buscar(db, g, id))?.periodos).toEqual([{ inicio: ENTRADA, fim: null }]);
  });

  it('inativar jogador reativado: saída antes do 2º período dá 422 e depois dele fecha só o período aberto', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    const url = `/api/grupos/${g}/jogadores/${id}/inativar`;
    await cliente(cen.adminA.cookie).post(url, { dataSaida: SAIDA_ANTIGA });
    await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${id}/reativar`);
    const antes = await cliente(cen.adminA.cookie).post(url, { dataSaida: diaRelativo(-1) });
    expect(antes.status).toBe(422);
    expect(antes.corpo).toMatchObject({ erro: { campos: { dataSaida: expect.any(String) } } });
    expect((await jogadoresRepo.buscar(db, g, id))?.periodos).toEqual([
      { inicio: ENTRADA, fim: SAIDA_ANTIGA },
      { inicio: HOJE, fim: null },
    ]);
    expect((await cliente(cen.adminA.cookie).post(url, { dataSaida: HOJE })).status).toBe(200);
    expect((await jogadoresRepo.buscar(db, g, id))?.periodos).toEqual([
      { inicio: ENTRADA, fim: SAIDA_ANTIGA },
      { inicio: HOJE, fim: HOJE },
    ]);
  });

  it('inativar: no-store, sem sessão 401 e sem X-Pelada 403', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    const url = `/api/grupos/${g}/jogadores/${id}/inativar`;
    const semCsrf = clienteTeste({ relogio: relogioFixo(HOJE), cookie: cen.adminA.cookie, semCsrf: true });
    expect((await semCsrf.post(url, {})).status).toBe(403);
    expect((await clienteTeste({ relogio: relogioFixo(HOJE) }).post(url, {})).status).toBe(401);
    const ok = await cliente(cen.adminA.cookie).post(url, {});
    expect(ok.status).toBe(200);
    expect(ok.headers.get('Cache-Control')).toBe('no-store');
  });

  it('reativar mantém a presença do período antigo e ativosNaData inclui hoje e exclui hoje − 1', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: ENTRADA });
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, {
        data: diaRelativo(-40),
        choveu: false,
        presencas: [{ jogadorId: id, situacao: 'presente' }],
        autor: cen.adminA.id,
        agora: AGORA,
      }),
    );
    await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${id}/inativar`, { dataSaida: SAIDA_ANTIGA });
    expect((await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${id}/reativar`)).status).toBe(200);
    const presencas = await kyselyDe(db)
      .selectFrom('presencas')
      .select('jogador_id')
      .where('jogador_id', '=', id)
      .execute();
    expect(presencas).toHaveLength(1);
    expect((await ativosNaData(db, g, diaRelativo(-40))).map((j) => j.id)).toContain(id);
    expect((await ativosNaData(db, g, HOJE)).map((j) => j.id)).toContain(id);
    expect((await ativosNaData(db, g, diaRelativo(-1))).map((j) => j.id)).not.toContain(id);
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
        data: PRESENCA,
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

  it('só com pagamento de mensalidade: 409 jogador_com_historico e nada some', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'ComPagamento' });
    await emTransacao(db, (tx) =>
      financeiro.marcar(tx, g, {
        jogadorId: id,
        mes: HOJE.slice(0, 7),
        lancamento: null,
        autor: cen.adminA.id,
        agora: AGORA,
      }),
    );
    const r = await cliente(cen.adminA.cookie).delete(`/api/grupos/${g}/jogadores/${id}`);
    expect(r.status).toBe(409);
    expect(erroJogadorComHistorico.safeParse(r.corpo).success).toBe(true);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${g}/jogadores/${id}`)).status).toBe(200);
  });

  it('outro grupo e malformado: 404', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const id = await criarJogador(db, cen.grupoA.id, cen.adminA.id);
    expect((await cliente(cen.adminB.cookie).delete(`/api/grupos/${cen.grupoB.id}/jogadores/${id}`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).delete(`/api/grupos/${cen.grupoA.id}/jogadores/abc`)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).get(`/api/grupos/${cen.grupoA.id}/jogadores/${id}`)).status).toBe(200);
  });

  it('segunda exclusão 404, no-store, sem sessão 401 e sem X-Pelada 403', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id);
    const url = `/api/grupos/${g}/jogadores/${id}`;
    const semCsrf = clienteTeste({ relogio: relogioFixo(HOJE), cookie: cen.adminA.cookie, semCsrf: true });
    expect((await semCsrf.delete(url)).status).toBe(403);
    expect((await clienteTeste({ relogio: relogioFixo(HOJE) }).delete(url)).status).toBe(401);
    const ok = await cliente(cen.adminA.cookie).delete(url);
    expect(ok.status).toBe(204);
    expect(ok.headers.get('Cache-Control')).toBe('no-store');
    expect((await cliente(cen.adminA.cookie).delete(url)).status).toBe(404);
  });
});
