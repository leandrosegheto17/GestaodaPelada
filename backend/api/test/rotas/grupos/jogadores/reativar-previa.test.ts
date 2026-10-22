import { periodoPreviaResposta } from '@pelada/contrato';
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
const url = (g: string, id: string) => `/api/grupos/${g}/jogadores/${id}/reativar/previa`;
const campos = (r: { corpo: unknown }) => (r.corpo as { erro: { campos: Record<string, string> } }).erro.campos;
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Jogador com entrada em d(-60) e saída em d(-45) (inativo); outro jogador presente em d(-30) e d(-10). */
async function cenario(db: Db) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: d(-400),
    registradoPor: cen.adminA.id,
    agora: AGORA_TESTE,
  });
  const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) });
  const outro = await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) });
  await jogadores.inativar(db, g, id, d(-45));
  for (const dia of [d(-30), d(-10)]) {
    await criarPartida(db, g, dia, cen.adminA.id, { presencas: [{ jogadorId: outro, situacao: 'presente' }] });
  }
  return { cen, g, id };
}

const fotografia = async (db: Db, g: string) => {
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
  return { auditoria: await total('auditoria'), periodos: await total('periodos_ativos') };
};

describe('POST /api/grupos/:g/jogadores/:id/reativar/previa (workerd)', () => {
  it('retorno retroativo: 200 no formato do contrato, com as faltas que passam a constar e aviso; não grava', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const antes = await fotografia(db, g);
    const r = await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: d(-35) });
    expect(r.status).toBe(200);
    const previa = periodoPreviaResposta.parse(r.corpo);
    expect(previa.rodadasQuePassamAConstar).toEqual([
      { data: d(-30), situacao: 'falta' },
      { data: d(-10), situacao: 'falta' },
    ]);
    expect(previa.aviso).toBe('Elas valem 0 ponto até você lançar a presença em Editar partida.');
    expect(await fotografia(db, g)).toEqual(antes);
  });

  it('retorno igual à saída anterior é aceito; retorno hoje é prévia neutra', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const igual = await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: d(-45) });
    expect(igual.status).toBe(200);
    expect(periodoPreviaResposta.safeParse(igual.corpo).success).toBe(true);
    const hoje = await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: HOJE_TESTE });
    expect(hoje.status).toBe(200);
    const previa = periodoPreviaResposta.parse(hoje.corpo);
    expect(previa.acumuladoDepois).toBe(previa.acumuladoAntes);
    expect(previa).toMatchObject({ rodadasQuePassamAConstar: [], rodadasQueDeixamDeConstar: [], aviso: null });
  });

  it('antes da saída anterior: 422 em dataRetorno com a data em dd/mm/aaaa; futura também', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const antes = await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: d(-46) });
    expect(antes.status).toBe(422);
    expect(Object.keys(campos(antes))).toEqual(['dataRetorno']);
    expect(campos(antes)['dataRetorno']).toBe(`O retorno não pode ser antes da saída anterior (${br(d(-45))}).`);
    const futuro = await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: d(1) });
    expect(futuro.status).toBe(422);
    expect(Object.keys(campos(futuro))).toEqual(['dataRetorno']);
  });

  it('vazia, malformada, ausente ou com campo extra: 422 do esquema, nunca 500', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    for (const corpo of [
      { dataRetorno: '' },
      { dataRetorno: '31/02/2026' },
      { dataRetorno: '2026-02-30' },
      {},
      { dataRetorno: d(-10), extra: 1 },
    ]) {
      const r = await cliente(cen.adminA.cookie).post(url(g, id), corpo);
      expect(r.status).toBe(422);
    }
    const vazia = await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: '' });
    expect(Object.keys(campos(vazia))).toEqual(['dataRetorno']);
  });

  it('jogador já ativo: 409 igual ao do reativar', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    await jogadores.reativar(db, g, id, d(-20));
    const r = await cliente(cen.adminA.cookie).post(url(g, id), { dataRetorno: d(-10) });
    const real = await cliente(cen.adminA.cookie).post(`/api/grupos/${g}/jogadores/${id}/reativar`, {});
    expect(r.status).toBe(409);
    expect(real.status).toBe(409);
    expect(r.corpo).toEqual(real.corpo);
  });

  it('404 uniforme: outro grupo, inexistente e id malformado', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const corpo = { dataRetorno: d(-35) };
    const alheio = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { dataEntrada: d(-60) });
    const inexistente = await cliente(cen.adminA.cookie).post(url(g, randomUUID()), corpo);
    expect(inexistente.status).toBe(404);
    for (const r of [
      await cliente(cen.adminA.cookie).post(url(g, alheio), corpo),
      await cliente(cen.adminB.cookie).post(url(g, id), corpo),
      await cliente(cen.adminB.cookie).post(url(cen.grupoB.id, id), corpo),
      await cliente(cen.adminA.cookie).post(url(g, 'abc'), corpo),
    ]) {
      expect(r.status).toBe(404);
      expect(r.corpo).toEqual(inexistente.corpo);
    }
  });

  it('sem sessão 401 e sem X-Pelada 403', async () => {
    const db = await abrir();
    const { cen, g, id } = await cenario(db);
    const corpo = { dataRetorno: d(-35) };
    expect((await cliente().post(url(g, id), corpo)).status).toBe(401);
    expect((await cliente(cen.adminA.cookie, true).post(url(g, id), corpo)).status).toBe(403);
  });
});
