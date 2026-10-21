import { inicioEditarResposta, inicioPreviaResposta } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
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
import { AGORA_TESTE, diaRelativo as d, HOJE_TESTE, relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo(HOJE_TESTE), ...(cookie ? { cookie } : {}), semCsrf });
const previa = (g: string, id: string) => `/api/grupos/${g}/jogadores/${id}/inicio/previa`;
const inicio = (g: string, id: string) => `/api/grupos/${g}/jogadores/${id}/inicio`;
const campos = (r: { corpo: unknown }) => (r.corpo as { erro: { campos: Record<string, string> } }).erro.campos;

/** Vandré: entrada e início em d(-30), pontuação inicial 30 e presenças em d(-20) e d(-10). */
async function cenario(db: Db) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: d(-400),
    registradoPor: cen.adminA.id,
    agora: AGORA_TESTE,
  });
  const id = await criarJogador(db, g, cen.adminA.id, { apelido: 'Vandre', dataEntrada: d(-30), pontuacaoInicial: 30 });
  for (const dia of [d(-20), d(-10)]) {
    await emTransacao(db, (tx) =>
      partidas.criar(tx, g, {
        data: dia,
        choveu: false,
        presencas: [{ jogadorId: id, situacao: 'presente' as const }],
        autor: cen.adminA.id,
        agora: AGORA_TESTE,
      }),
    );
  }
  return { cen, g, id };
}

const fotografia = async (db: Db, g: string, id: string) => {
  const banco = kyselyDe(db);
  const total = async (tabela: 'auditoria' | 'periodos_ativos') =>
    Number(
      (
        await banco
          .selectFrom(tabela)
          .select((e) => e.fn.countAll().as('n'))
          .where('grupo_id', '=', g)
          .executeTakeFirstOrThrow()
      ).n,
    );
  return {
    auditoria: await total('auditoria'),
    periodos: await total('periodos_ativos'),
    jogador: await jogadores.buscar(db, g, id),
  };
};

describe('POST /api/grupos/:g/jogadores/:id/inicio/previa (workerd)', () => {
  it('avançar e recuar: 200 validado pelo contrato e nada gravado', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const antes = await fotografia(db, g, id);
    const avancar = await cliente(cen.adminA.cookie).post(previa(g, id), { data: d(-10) });
    expect(avancar.status).toBe(200);
    expect(inicioPreviaResposta.parse(avancar.corpo)).toMatchObject({ acumuladoAntes: 32, acumuladoDepois: 1 });
    const recuar = await cliente(cen.adminA.cookie).post(previa(g, id), { data: d(-60) });
    expect(inicioPreviaResposta.parse(recuar.corpo)).toMatchObject({ acumuladoAntes: 32, acumuladoDepois: 32 });
    expect(await fotografia(db, g, id)).toEqual(antes);
  });

  it('data inválida, futura ou campo extra: 422 no campo, sem gravar', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    for (const data of [d(1), '2026-02-30', '', '22/10/2026', '0000-01-01', '0001-01-01', '1999-12-31']) {
      const r = await cliente(cen.adminA.cookie).post(previa(g, id), { data });
      expect(r.status).toBe(422);
      expect(Object.keys(campos(r))).toEqual(['data']);
    }
    expect((await cliente(cen.adminA.cookie).post(previa(g, id), { data: d(-5), extra: 1 })).status).toBe(422);
    expect((await cliente(cen.adminA.cookie).post(previa(g, id), {})).status).toBe(422);
  });

  it('sem sessão 401; sem X-Pelada 403; admin de outro grupo, jogador de outro grupo e id malformado 404', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const corpo = { data: d(-10) };
    expect((await cliente().post(previa(g, id), corpo)).status).toBe(401);
    expect((await cliente(cen.adminA.cookie, true).post(previa(g, id), corpo)).status).toBe(403);
    expect((await cliente(cen.adminB.cookie).post(previa(g, id), corpo)).status).toBe(404);
    expect((await cliente(cen.adminB.cookie).post(previa(cen.grupoB.id, id), corpo)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).post(previa(g, randomUUID()), corpo)).status).toBe(404);
    expect((await cliente(cen.adminA.cookie).post(previa(g, 'abc'), corpo)).status).toBe(404);
  });
});

describe('PUT /api/grupos/:g/jogadores/:id/inicio (workerd)', () => {
  it('grava, audita e devolve a data; igual à atual não grava nem audita', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const r = await cliente(cen.adminA.cookie).put(inicio(g, id), { data: d(-60) });
    expect(r.status).toBe(200);
    expect(inicioEditarResposta.parse(r.corpo)).toEqual({ inicio: d(-60), alterado: true });
    expect(await jogadores.buscar(db, g, id)).toMatchObject({
      inicioPontuacao: d(-60),
      periodos: [{ inicio: d(-60), fim: null }],
    });
    const antes = await fotografia(db, g, id);
    const igual = await cliente(cen.adminA.cookie).put(inicio(g, id), { data: d(-60) });
    expect(inicioEditarResposta.parse(igual.corpo)).toEqual({ inicio: d(-60), alterado: false });
    expect(await fotografia(db, g, id)).toEqual(antes);
    const eventos = await kyselyDe(db)
      .selectFrom('auditoria')
      .select(['resumo', 'autor_conta_id'])
      .where('grupo_id', '=', g)
      .where('acao', '=', 'jogador_inicio_alterado')
      .execute();
    expect(eventos).toEqual([
      {
        resumo: { anterior: d(-30), novo: d(-60), acumuladoAntes: 32, acumuladoDepois: 32 },
        autor_conta_id: cen.adminA.id,
      },
    ]);
  });

  it('data inválida ou futura: 422 e nada gravado', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    for (const data of [d(1), '2026-02-30', '', '0000-01-01', '0001-01-01', '1999-12-31']) {
      const r = await cliente(cen.adminA.cookie).put(inicio(g, id), { data });
      expect(r.status).toBe(422);
      expect(Object.keys(campos(r))).toEqual(['data']);
    }
    expect((await jogadores.buscar(db, g, id))?.inicioPontuacao).toBe(d(-30));
  });

  it('depois da saída do 1º período: 422; sem sessão 401; outro grupo 404 sem gravar', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    await emTransacao(db, (tx) => jogadores.inativar(tx, g, id, d(-5)));
    const depois = await cliente(cen.adminA.cookie).put(inicio(g, id), { data: d(-2) });
    expect(depois.status).toBe(422);
    expect(depois.texto).not.toContain(d(-2));
    expect((await cliente().put(inicio(g, id), { data: d(-10) })).status).toBe(401);
    expect((await cliente(cen.adminB.cookie).put(inicio(g, id), { data: d(-10) })).status).toBe(404);
    expect((await cliente(cen.adminB.cookie).put(inicio(cen.grupoB.id, id), { data: d(-10) })).status).toBe(404);
    expect((await jogadores.buscar(db, g, id))?.inicioPontuacao).toBe(d(-30));
  });
});

describe('PATCH /api/grupos/:g/jogadores/:id com dataEntrada (app anterior)', () => {
  it('aceita e ignora: nem a data de início nem o período mudam', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const r = await cliente(cen.adminA.cookie).patch(`/api/grupos/${g}/jogadores/${id}`, {
      apelido: 'Vandre',
      anoNascimento: 1990,
      posicao: 'meia',
      dataEntrada: d(-100),
    });
    expect(r.status).toBe(200);
    expect(await jogadores.buscar(db, g, id)).toMatchObject({
      inicioPontuacao: d(-30),
      periodos: [{ inicio: d(-30), fim: null }],
    });
  });
});
