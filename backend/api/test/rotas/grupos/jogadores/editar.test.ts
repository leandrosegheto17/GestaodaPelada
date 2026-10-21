import { jogadorDetalhe } from '@pelada/contrato';
import { PESOS_PADRAO, calcularRanking } from '@pelada/dominio';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { carregarHistoricoGrupo } from '../../../../src/aplicacao/pontuacao/historico.js';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import { emTransacao, type Db } from '../../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { AGORA_TESTE, diaRelativo, HOJE_TESTE, relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const ANO = Number(HOJE_TESTE.slice(0, 4));
const cliente = (cookie: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo(HOJE_TESTE), cookie, semCsrf });
const url = (g: string, id: string) => `/api/grupos/${g}/jogadores/${id}`;
const corpoBase = { apelido: 'Editado', anoNascimento: 1985, posicao: 'goleiro', telefone: null };
const campos = (r: { corpo: unknown }) => (r.corpo as { erro: { campos: Record<string, string> } }).erro.campos;

const periodosDe = async (db: Db, id: string) =>
  (
    await kyselyDe(db)
      .selectFrom('periodos_ativos')
      .select(['inicio', 'fim'])
      .where('jogador_id', '=', id)
      .orderBy('inicio')
      .execute()
  ).map((p) => ({ inicio: String(p.inicio), fim: p.fim === null ? null : String(p.fim) }));

const criarPartida = (db: Db, g: string, autor: string, data: string, presentes: string[]) =>
  emTransacao(db, (tx) =>
    partidas.criar(tx, g, {
      data,
      choveu: false,
      presencas: presentes.map((jogadorId) => ({ jogadorId, situacao: 'presente' as const })),
      autor,
      agora: AGORA_TESTE,
    }),
  );

describe('PATCH /api/grupos/:g/jogadores/:id (editar, workerd)', () => {
  it('edita os dados, valida o detalhe e limpa o telefone com null', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Antes' });
    const comTel = await cliente(cen.adminA.cookie).patch(url(g, id), {
      ...corpoBase,
      telefone: '(11) 98765-4321',
    });
    expect(comTel.status).toBe(200);
    expect(jogadorDetalhe.parse(comTel.corpo)).toMatchObject({
      apelido: 'Editado',
      posicao: 'goleiro',
      anoNascimento: 1985,
      telefone: '11987654321',
    });
    const limpo = await cliente(cen.adminA.cookie).patch(url(g, id), corpoBase);
    expect(jogadorDetalhe.parse(limpo.corpo).telefone).toBeNull();
  });

  it('editar a pontuação inicial audita o valor anterior e muda o ranking público', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Sigiloso', pontuacaoInicial: 5 });
    await pesos.criarPadrao(db, g, {
      pesos: PESOS_PADRAO,
      vigenteDesde: diaRelativo(-400),
      registradoPor: cen.adminA.id,
      agora: AGORA_TESTE,
    });
    const mudou = await cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, pontuacaoInicial: 40 });
    expect(mudou.status).toBe(200);
    expect(jogadorDetalhe.parse(mudou.corpo).pontuacaoInicial).toBe(40);
    const eventos = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['acao', 'entidade_id', 'resumo', 'autor_conta_id'])
      .where('grupo_id', '=', g)
      .where('acao', '=', 'jogador_pontuacao_inicial_alterada')
      .execute();
    expect(eventos).toEqual([
      {
        acao: 'jogador_pontuacao_inicial_alterada',
        entidade_id: id,
        resumo: { anterior: 5, novo: 40 },
        autor_conta_id: cen.adminA.id,
      },
    ]);
    const publico = await clienteTeste({ relogio: relogioFixo(HOJE_TESTE) }).get(
      `/api/publico/${cen.grupoA.slug}/ranking`,
    );
    const linha = (publico.corpo as { linhas: { apelido: string; ptsFinal: number }[] }).linhas[0];
    expect(linha).toMatchObject({ apelido: 'Editado', ptsFinal: 40 });
    expect(publico.texto).not.toContain('pontuacaoInicial');
    await cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, pontuacaoInicial: 40 });
    const depois = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('id')
      .where('acao', '=', 'jogador_pontuacao_inicial_alterada')
      .where('grupo_id', '=', g)
      .execute();
    expect(depois).toHaveLength(1);
  });

  it('editar sem pontuacaoInicial mantém o valor, o ranking e não audita', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Mantido', pontuacaoInicial: 25 });
    await pesos.criarPadrao(db, g, {
      pesos: PESOS_PADRAO,
      vigenteDesde: diaRelativo(-400),
      registradoPor: cen.adminA.id,
      agora: AGORA_TESTE,
    });
    const r = await cliente(cen.adminA.cookie).patch(url(g, id), corpoBase);
    expect(r.status).toBe(200);
    expect(jogadorDetalhe.parse(r.corpo).pontuacaoInicial).toBe(25);
    expect((await jogadores.buscar(db, g, id))?.pontuacaoInicial).toBe(25);
    const eventos = await kyselyDe(db)
      .selectFrom('auditoria')
      .select('id')
      .where('grupo_id', '=', g)
      .where('acao', '=', 'jogador_pontuacao_inicial_alterada')
      .execute();
    expect(eventos).toHaveLength(0);
    const publico = await clienteTeste({ relogio: relogioFixo(HOJE_TESTE) }).get(
      `/api/publico/${cen.grupoA.slug}/ranking`,
    );
    const linha = (publico.corpo as { linhas: { apelido: string; ptsFinal: number }[] }).linhas[0];
    expect(linha).toMatchObject({ apelido: 'Editado', ptsFinal: 25 });
  });

  it('pontuação inicial inválida na edição: 422 no campo, sem gravar', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { pontuacaoInicial: 7 });
    for (const valor of [-1, 10000, 2.5]) {
      const r = await cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, pontuacaoInicial: valor });
      expect(r.status).toBe(422);
      expect(Object.keys(campos(r))).toContain('pontuacaoInicial');
    }
    expect((await jogadores.buscar(db, g, id))?.pontuacaoInicial).toBe(7);
  });

  it('dataEntrada no corpo é aceita e ignorada: período e data de início ficam', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const [e0, fim0, e1] = [diaRelativo(-60), diaRelativo(-40), diaRelativo(-20)];
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Periodos', dataEntrada: e0 });
    await emTransacao(db, async (tx) => {
      await jogadores.inativar(tx, g, id, fim0);
      await jogadores.reativar(tx, g, id, e1);
    });
    for (const dataEntrada of [diaRelativo(-70), diaRelativo(-10)]) {
      const r = await cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, dataEntrada });
      expect(r.status).toBe(200);
      expect(jogadorDetalhe.parse(r.corpo).situacao).toEqual({ ativo: true, desde: e1 });
    }
    expect(await periodosDe(db, id)).toEqual([
      { inicio: e0, fim: fim0 },
      { inicio: e1, fim: null },
    ]);
    expect((await jogadores.buscar(db, g, id))?.inicioPontuacao).toBe(e0);
  });

  it('apelido de outro jogador sem caixa dá 422 no campo; manter o próprio apelido dá 200', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await criarJogador(db, g, cen.adminA.id, { apelido: 'Existente' });
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Proprio' });
    const repetido = await cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, apelido: 'EXISTENTE' });
    expect(repetido.status).toBe(422);
    expect(Object.keys(campos(repetido))).toEqual(['apelido']);
    expect((await cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, apelido: 'Proprio' })).status).toBe(200);
  });

  it('reflete no ranking: ano de nascimento desempata e início posterior troca falta por fora', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const dia = (n: number) => diaRelativo(n);
    const ana = await criarJogador(db, g, cen.adminA.id, { apelido: 'Ana', ano: 1995, dataEntrada: dia(-30) });
    const beto = await criarJogador(db, g, cen.adminA.id, { apelido: 'Beto', ano: 1990, dataEntrada: dia(-30) });
    const caio = await criarJogador(db, g, cen.adminA.id, { apelido: 'Caio', ano: 1980, dataEntrada: dia(-30) });
    await pesos.criarPadrao(db, g, {
      pesos: PESOS_PADRAO,
      vigenteDesde: dia(-60),
      registradoPor: cen.adminA.id,
      agora: AGORA_TESTE,
    });
    await criarPartida(db, g, cen.adminA.id, dia(-10), [ana, beto]);
    const ranking = async () => {
      const h = await carregarHistoricoGrupo(db, g, HOJE_TESTE);
      return calcularRanking({ hoje: HOJE_TESTE, mes: dia(-10).slice(0, 7), ...h }).linhas;
    };
    const editar = (id: string, apelido: string, extra: object) =>
      cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, apelido, ...extra });
    const avancarInicio = (id: string, data: string) =>
      cliente(cen.adminA.cookie).put(`${url(g, id)}/inicio`, { data });

    const antes = await ranking();
    expect(antes.map((l) => l.apelido)).toEqual(['Beto', 'Ana', 'Caio']);
    expect(antes.find((l) => l.apelido === 'Caio')?.rodadas.map((r) => r.situacao)).toEqual(['falta']);

    expect((await editar(ana, 'Ana', { anoNascimento: 1970 })).status).toBe(200);
    expect((await ranking()).map((l) => l.apelido)).toEqual(['Ana', 'Beto', 'Caio']);

    expect((await avancarInicio(caio, dia(-8))).status).toBe(200);
    const depois = (await ranking()).find((l) => l.apelido === 'Caio');
    expect(depois?.rodadas.map((r) => r.situacao)).toEqual(['fora']);
  });

  it('422 do contrato, 404 de outro grupo e malformado, 403 sem X-Pelada', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Contrato' });
    const ano = await cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, anoNascimento: ANO - 5 });
    expect(ano.status).toBe(422);
    expect(Object.keys(campos(ano))).toContain('anoNascimento');
    for (const extra of [{ nivel: 9 }, { grupoId: randomUUID() }, { id: randomUUID() }]) {
      expect((await cliente(cen.adminA.cookie).patch(url(g, id), { ...corpoBase, ...extra })).status).toBe(422);
    }
    expect((await cliente(cen.adminB.cookie).patch(url(cen.grupoB.id, id), corpoBase)).status).toBe(404);
    expect((await cliente(cen.adminB.cookie).patch(url(g, id), corpoBase)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).patch(url(g, 'abc'), corpoBase)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie, true).patch(url(g, id), corpoBase)).status).toBe(403);
    const intacto = await kyselyDe(db)
      .selectFrom('jogadores')
      .select('apelido')
      .where('id', '=', id)
      .executeTakeFirst();
    expect(intacto?.apelido).toBe('Contrato');
  });
});
