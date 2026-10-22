import { periodoCorrigirResposta } from '@pelada/contrato';
import { PESOS_PADRAO } from '@pelada/dominio';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { kyselyDe } from '../../../../src/infraestrutura/db/cliente.js';
import type { Db } from '../../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as pesos from '../../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../../apoio/cenario-acesso.js';
import { clienteTeste } from '../../../apoio/cliente.js';
import { usarDbDoWorker } from '../../../apoio/db-worker.js';
import { criarJogador } from '../../../apoio/fabricas/jogadores.js';
import { criarPartida } from '../../../apoio/fabricas/partidas.js';
import { usarFabrica } from '../../../apoio/fabrica.js';
import { AGORA_TESTE, diaRelativo as d, HOJE_TESTE, relogioFixo } from '../../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDbDoWorker(fabrica);
const cliente = (cookie?: string, semCsrf = false) =>
  clienteTeste({ relogio: relogioFixo(HOJE_TESTE), ...(cookie ? { cookie } : {}), semCsrf });
const url = (g: string, id: string, p: string) => `/api/grupos/${g}/jogadores/${id}/periodos/${p}`;
const campos = (r: { corpo: unknown }) => (r.corpo as { erro: { campos: Record<string, string> } }).erro.campos;

/** Entrada em d(-60), saída em d(-45), retorno em d(-20) (aberto); presenças em d(-50) e d(-15). */
async function cenario(db: Db) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: d(-400),
    registradoPor: cen.adminA.id,
    agora: AGORA_TESTE,
  });
  const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60), pontuacaoInicial: 7 });
  await jogadores.inativar(db, g, id, d(-45));
  await jogadores.reativar(db, g, id, d(-20));
  for (const dia of [d(-50), d(-15)]) {
    await criarPartida(db, g, dia, cen.adminA.id, { presencas: [{ jogadorId: id, situacao: 'presente' }] });
  }
  const [entrada, retorno] = (await jogadores.buscar(db, g, id))?.periodos ?? [];
  return { cen, g, id, entrada: entrada!, retorno: retorno! };
}

const fotografia = async (db: Db, g: string, id: string) => {
  const banco = kyselyDe(db);
  const total = async (tabela: 'auditoria' | 'partidas' | 'presencas') =>
    Number(
      (
        await banco
          .selectFrom(tabela)
          .select((e) => e.fn.countAll().as('n'))
          .where('grupo_id', '=', g)
          .executeTakeFirstOrThrow()
      ).n,
    );
  const j = await banco
    .selectFrom('jogadores')
    .select(['pontuacao_inicial', 'inicio_pontuacao'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();
  return {
    auditoria: await total('auditoria'),
    partidas: await total('partidas'),
    presencas: await total('presencas'),
    pontuacaoInicial: j.pontuacao_inicial,
    inicioPontuacao: j.inicio_pontuacao,
    periodos: (await jogadores.buscar(db, g, id))?.periodos.map(({ inicio, fim }) => ({ inicio, fim })),
  };
};

const eventos = (db: Db, g: string) =>
  kyselyDe(db)
    .selectFrom('auditoria')
    .select(['resumo', 'autor_conta_id', 'entidade', 'entidade_id'])
    .where('grupo_id', '=', g)
    .where('acao', '=', 'jogador_periodo_corrigido')
    .execute();

describe('PUT /api/grupos/:g/jogadores/:id/periodos/:periodoId (workerd)', () => {
  it('corrige só a saída do 1º período: 200 no formato do contrato e 1 auditoria', async () => {
    const db = await abrir();
    const { cen, g, id, entrada, retorno } = await cenario(db);
    const antes = await fotografia(db, g, id);
    const r = await cliente(cen.adminA.cookie).put(url(g, id, entrada.id), { saida: d(-40) });
    expect(r.status).toBe(200);
    const corpo = periodoCorrigirResposta.parse(r.corpo);
    expect(corpo.alterado).toBe(true);
    expect(corpo.periodos).toEqual([
      { id: entrada.id, tipo: 'entrada', inicio: d(-60), fim: d(-40), corrigivel: { saida: true, retorno: false } },
      { id: retorno.id, tipo: 'retorno', inicio: d(-20), fim: null, corrigivel: { saida: false, retorno: true } },
    ]);
    const depois = await fotografia(db, g, id);
    expect(depois).toEqual({
      ...antes,
      auditoria: antes.auditoria + 1,
      periodos: [
        { inicio: d(-60), fim: d(-40) },
        { inicio: d(-20), fim: null },
      ],
    });
    const [evento] = await eventos(db, g);
    expect(evento).toMatchObject({ autor_conta_id: cen.adminA.id, entidade: 'jogador', entidade_id: id });
    expect(evento?.resumo).toMatchObject({
      periodo: entrada.id,
      saidaAnterior: d(-45),
      saidaNova: d(-40),
      retornoAnterior: d(-60),
      retornoNovo: d(-60),
    });
    expect(Object.keys(evento?.resumo as object)).toEqual(
      expect.arrayContaining(['acumuladoAntes', 'acumuladoDepois', 'posicaoAntes', 'posicaoDepois']),
    );
  });

  it('corrige só o retorno do 2º período e depois saída e retorno juntos', async () => {
    const db = await abrir();
    const { cen, g, id, retorno } = await cenario(db);
    const so = await cliente(cen.adminA.cookie).put(url(g, id, retorno.id), { retorno: d(-18) });
    expect(so.status).toBe(200);
    expect((await jogadores.buscar(db, g, id))?.periodos[1]).toMatchObject({ inicio: d(-18), fim: null });
    await jogadores.inativar(db, g, id, d(-10));
    const dois = await cliente(cen.adminA.cookie).put(url(g, id, retorno.id), { retorno: d(-19), saida: d(-12) });
    expect(dois.status).toBe(200);
    expect(periodoCorrigirResposta.parse(dois.corpo).alterado).toBe(true);
    expect((await jogadores.buscar(db, g, id))?.periodos[1]).toMatchObject({ inicio: d(-19), fim: d(-12) });
    expect(await eventos(db, g)).toHaveLength(2);
  });

  it('datas iguais às atuais: 200 alterado false, sem escrita nem auditoria', async () => {
    const db = await abrir();
    const { cen, g, id, entrada, retorno } = await cenario(db);
    const antes = await fotografia(db, g, id);
    for (const [p, corpo] of [
      [entrada.id, { saida: d(-45) }],
      [retorno.id, { retorno: d(-20) }],
    ] as const) {
      const r = await cliente(cen.adminA.cookie).put(url(g, id, p), corpo);
      expect(r.status).toBe(200);
      expect(periodoCorrigirResposta.parse(r.corpo).alterado).toBe(false);
    }
    expect(await fotografia(db, g, id)).toEqual(antes);
  });

  it('recusas de domínio: 422 no campo certo, nada gravado', async () => {
    const db = await abrir();
    const { cen, g, id, entrada, retorno } = await cenario(db);
    const antes = await fotografia(db, g, id);
    const casos = [
      [entrada.id, { saida: d(-55) }, 'saida'],
      [entrada.id, { saida: d(-10) }, 'saida'],
      [entrada.id, { saida: d(1) }, 'saida'],
      [retorno.id, { retorno: d(-10) }, 'retorno'],
      [retorno.id, { retorno: d(-46) }, 'retorno'],
      [retorno.id, { saida: d(-5) }, 'saida'],
    ] as const;
    for (const [p, corpo, campo] of casos) {
      const r = await cliente(cen.adminA.cookie).put(url(g, id, p), corpo);
      expect(r.status).toBe(422);
      expect(Object.keys(campos(r))).toEqual([campo]);
    }
    expect(await fotografia(db, g, id)).toEqual(antes);
  });

  it('presença antiga fora do período não trava a correção que não a afeta', async () => {
    const db = await abrir();
    const { cen, g, id, entrada } = await cenario(db);
    await criarPartida(db, g, d(-44), cen.adminA.id, { presencas: [{ jogadorId: id, situacao: 'presente' }] });
    const r = await cliente(cen.adminA.cookie).put(url(g, id, entrada.id), { saida: d(-44) });
    expect(r.status).toBe(200);
  });

  it('corpo vazio, campo extra ou data inválida: 422 do esquema, nunca 500', async () => {
    const db = await abrir();
    const { cen, g, id, retorno } = await cenario(db);
    for (const corpo of [{}, { retorno: d(-10), extra: 1 }, { retorno: '2026-02-30' }, { retorno: '' }, { saida: 5 }]) {
      expect((await cliente(cen.adminA.cookie).put(url(g, id, retorno.id), corpo)).status).toBe(422);
    }
  });

  it('404 para período de outro jogador/grupo, inexistente, id malformado e admin de outro grupo', async () => {
    const db = await abrir();
    const { cen, g, id, retorno } = await cenario(db);
    const corpo = { retorno: d(-18) };
    const outro = await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) });
    const alheio = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { dataEntrada: d(-60) });
    const periodoAlheio = (await jogadores.buscar(db, cen.grupoB.id, alheio))!.periodos[0]!;
    const inexistente = await cliente(cen.adminA.cookie).put(url(g, id, randomUUID()), corpo);
    expect(inexistente.status).toBe(404);
    for (const r of [
      await cliente(cen.adminA.cookie).put(url(g, outro, retorno.id), corpo),
      await cliente(cen.adminA.cookie).put(url(g, id, periodoAlheio.id), corpo),
      await cliente(cen.adminB.cookie).put(url(g, id, retorno.id), corpo),
      await cliente(cen.adminB.cookie).put(url(cen.grupoB.id, id, retorno.id), corpo),
      await cliente(cen.adminA.cookie).put(url(g, id, 'abc'), corpo),
    ]) {
      expect(r.status).toBe(404);
      expect(r.corpo).toEqual(inexistente.corpo);
    }
    expect((await jogadores.buscar(db, g, id))?.periodos[1]?.inicio).toBe(d(-20));
    expect(await eventos(db, g)).toHaveLength(0);
  });

  it('sem sessão 401 e sem X-Pelada 403', async () => {
    const db = await abrir();
    const { cen, g, id, retorno } = await cenario(db);
    expect((await cliente().put(url(g, id, retorno.id), { retorno: d(-18) })).status).toBe(401);
    expect((await cliente(cen.adminA.cookie, true).put(url(g, id, retorno.id), { retorno: d(-18) })).status).toBe(403);
  });
});
