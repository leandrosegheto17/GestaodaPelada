import { jogadorDetalhe } from '@pelada/contrato';
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
const cliente = (cookie: string) => clienteTeste({ relogio: relogioFixo(HOJE_TESTE), cookie });
const url = (g: string, id: string) => `/api/grupos/${g}/jogadores/${id}/reativar`;
const campos = (r: { corpo: unknown }) => (r.corpo as { erro: { campos: Record<string, string> } }).erro.campos;

/** Entrada em d(-60), saída em d(-10), com uma presença em d(-30); jogador inativo. */
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
  await criarPartida(db, g, d(-30), cen.adminA.id, { presencas: [{ jogadorId: id, situacao: 'presente' }] });
  await jogadores.inativar(db, g, id, d(-10));
  return { cen, g, id };
}

const auditorias = (db: Db, g: string) =>
  kyselyDe(db).selectFrom('auditoria').select(['acao', 'resumo']).where('grupo_id', '=', g).execute();

const intervalos = async (db: Db, g: string, id: string) =>
  (await jogadores.buscar(db, g, id))?.periodos.map(({ inicio, fim }) => ({ inicio, fim }));

const invariantes = async (db: Db, id: string) =>
  kyselyDe(db)
    .selectFrom('jogadores')
    .select(['inicio_pontuacao', 'pontuacao_inicial'])
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

describe('POST /api/grupos/:g/jogadores/:id/reativar com dataRetorno (workerd)', () => {
  it('retorno retroativo: 200, período novo a partir da data, 1 auditoria e invariantes intactos', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const antes = await invariantes(db, id);
    const r = await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: d(-8) });
    expect(r.status).toBe(200);
    expect(jogadorDetalhe.parse(r.corpo).situacao).toEqual({ ativo: true, desde: d(-8) });
    expect(await intervalos(db, g, id)).toEqual([
      { inicio: d(-60), fim: d(-10) },
      { inicio: d(-8), fim: null },
    ]);
    const lista = (await auditorias(db, g)).filter((e) => e.acao === 'jogador_reativado_retroativo');
    expect(lista).toHaveLength(1);
    expect(lista[0]?.resumo).toMatchObject({ retorno: d(-8), saidaAnterior: d(-10) });
    expect(Object.keys(lista[0]?.resumo as object)).toEqual(
      expect.arrayContaining(['acumuladoAntes', 'acumuladoDepois', 'posicaoAntes', 'posicaoDepois']),
    );
    expect(await invariantes(db, id)).toEqual(antes);
  });

  it('retorno igual à saída anterior é aceito', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    expect((await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: d(-10) })).status).toBe(200);
    expect((await intervalos(db, g, id))?.[1]).toEqual({ inicio: d(-10), fim: null });
  });

  // Um cenário por teste: o dono da conta é único no banco e o lock só solta no fim do teste.
  it.each([
    ['sem corpo', undefined],
    ['{}', {}],
    ['hoje', { dataRetorno: HOJE_TESTE }],
  ])('%s reativa hoje e não audita', async (_nome, corpo) => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const r = await cliente(cen.adminA.cookie).post(url(g, id), corpo);
    expect(r.status).toBe(200);
    expect(jogadorDetalhe.parse(r.corpo).situacao).toEqual({ ativo: true, desde: HOJE_TESTE });
    expect((await auditorias(db, g)).filter((e) => e.acao === 'jogador_reativado_retroativo')).toHaveLength(0);
  });

  it('recusas viram 422 em campos.dataRetorno e nada é gravado', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const c = cliente(cen.adminA.cookie);
    const anterior = await c.post(url(g, id), { dataRetorno: d(-11) });
    expect(anterior.status).toBe(422);
    expect(campos(anterior).dataRetorno).toContain(
      `${d(-10).slice(8, 10)}/${d(-10).slice(5, 7)}/${d(-10).slice(0, 4)}`,
    );
    for (const dataRetorno of ['', '2026-02-30', d(1)]) {
      const r = await c.post(url(g, id), { dataRetorno });
      expect(r.status).toBe(422);
      expect(campos(r).dataRetorno).toEqual(expect.any(String));
    }
    expect(await intervalos(db, g, id)).toEqual([{ inicio: d(-60), fim: d(-10) }]);
    expect(await auditorias(db, g)).toHaveLength(0);
  });

  it('já ativo é 409 com ou sem data; outro grupo e inexistente são 404', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const c = cliente(cen.adminA.cookie);
    expect((await c.post(url(g, id), { dataRetorno: d(-8) })).status).toBe(200);
    const denovo = await c.post(url(g, id), { dataRetorno: d(-5) });
    expect(denovo.status).toBe(409);
    expect(denovo.corpo).toMatchObject({ erro: { codigo: 'jogador_ja_ativo' } });
    expect((await cliente(cen.adminB.cookie).post(url(cen.grupoB.id, id), { dataRetorno: d(-8) })).status).toBe(404);
    expect((await c.post(url(g, randomUUID()), { dataRetorno: d(-8) })).status).toBe(404);
  });
});
