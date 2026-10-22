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
const url = (g: string, id: string, p: string) => `/api/grupos/${g}/jogadores/${id}/periodos/${p}/previa`;
const campos = (r: { corpo: unknown }) => (r.corpo as { erro: { campos: Record<string, string> } }).erro.campos;
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

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
  const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) });
  await jogadores.inativar(db, g, id, d(-45));
  await jogadores.reativar(db, g, id, d(-20));
  for (const dia of [d(-50), d(-15)]) {
    await criarPartida(db, g, dia, cen.adminA.id, { presencas: [{ jogadorId: id, situacao: 'presente' }] });
  }
  const [entrada, retorno] = (await jogadores.buscar(db, g, id))?.periodos ?? [];
  return { cen, g, id, entrada: entrada!, retorno: retorno! };
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

describe('POST /api/grupos/:g/jogadores/:id/periodos/:periodoId/previa (workerd)', () => {
  it('antecipar retorno, adiar retorno e mudar saída: 200 no formato do contrato, sem gravar', async () => {
    const db = await abrir();
    const { cen, g, id, entrada, retorno } = await cenario(db);
    const antes = await fotografia(db, g);
    for (const [periodo, corpo] of [
      [retorno.id, { retorno: d(-35) }],
      [retorno.id, { retorno: d(-18) }],
      [entrada.id, { saida: d(-40) }],
    ] as const) {
      const r = await cliente(cen.adminA.cookie).post(url(g, id, periodo), corpo);
      expect(r.status).toBe(200);
      expect(periodoPreviaResposta.safeParse(r.corpo).success).toBe(true);
    }
    expect(await fotografia(db, g)).toEqual(antes);
  });

  it('valores iguais aos atuais: 200 com prévia neutra', async () => {
    const db = await abrir();
    const { cen, g, id, entrada, retorno } = await cenario(db);
    const r = await cliente(cen.adminA.cookie).post(url(g, id, entrada.id), { saida: d(-45) });
    expect(r.status).toBe(200);
    const previa = periodoPreviaResposta.parse(r.corpo);
    expect(previa.acumuladoDepois).toBe(previa.acumuladoAntes);
    expect(previa).toMatchObject({ rodadasQuePassamAConstar: [], rodadasQueDeixamDeConstar: [], aviso: null });
    const igual = await cliente(cen.adminA.cookie).post(url(g, id, retorno.id), { retorno: d(-20) });
    expect(igual.status).toBe(200);
    expect(periodoPreviaResposta.parse(igual.corpo).aviso).toBeNull();
  });

  it('recusas de domínio: 422 no campo certo, com a data limite em dd/mm/aaaa', async () => {
    const db = await abrir();
    const { cen, g, id, entrada, retorno } = await cenario(db);
    const futuro = await cliente(cen.adminA.cookie).post(url(g, id, retorno.id), { retorno: d(1) });
    expect(futuro.status).toBe(422);
    expect(Object.keys(campos(futuro))).toEqual(['retorno']);

    const antesDaSaida = await cliente(cen.adminA.cookie).post(url(g, id, retorno.id), { retorno: d(-46) });
    expect(antesDaSaida.status).toBe(422);
    expect(campos(antesDaSaida)['retorno']).toContain(br(d(-45)));

    const comPresenca = await cliente(cen.adminA.cookie).post(url(g, id, retorno.id), { retorno: d(-10) });
    expect(comPresenca.status).toBe(422);
    expect(campos(comPresenca)['retorno']).toContain(br(d(-15)));

    const saidaPresenca = await cliente(cen.adminA.cookie).post(url(g, id, entrada.id), { saida: d(-55) });
    expect(saidaPresenca.status).toBe(422);
    expect(campos(saidaPresenca)['saida']).toContain(br(d(-50)));

    const naoCorrigivel = await cliente(cen.adminA.cookie).post(url(g, id, retorno.id), { saida: d(-5) });
    expect(naoCorrigivel.status).toBe(422);
    expect(Object.keys(campos(naoCorrigivel))).toEqual(['saida']);
  });

  it('corpo vazio, campo extra ou data malformada: 422 do esquema, nunca 500', async () => {
    const db = await abrir();
    const { cen, g, id, retorno } = await cenario(db);
    for (const corpo of [
      {},
      { retorno: d(-10), extra: 1 },
      { retorno: '2026-02-30' },
      { retorno: '22/10/2026' },
      { saida: 5 },
    ]) {
      const r = await cliente(cen.adminA.cookie).post(url(g, id, retorno.id), corpo);
      expect(r.status).toBe(422);
    }
  });

  it('404 para período de outro jogador, de outro grupo, inexistente, jogador de outro grupo e id malformado', async () => {
    const db = await abrir();
    const { cen, g, id, retorno } = await cenario(db);
    const corpo = { retorno: d(-35) };
    const outro = await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) });
    const alheio = await criarJogador(db, cen.grupoB.id, cen.adminB.id, { dataEntrada: d(-60) });
    const periodoAlheio = (await jogadores.buscar(db, cen.grupoB.id, alheio))!.periodos[0]!;
    const inexistente = await cliente(cen.adminA.cookie).post(url(g, id, randomUUID()), corpo);
    expect(inexistente.status).toBe(404);
    for (const r of [
      await cliente(cen.adminA.cookie).post(url(g, outro, retorno.id), corpo),
      await cliente(cen.adminA.cookie).post(url(g, id, periodoAlheio.id), corpo),
      await cliente(cen.adminA.cookie).post(url(g, alheio, periodoAlheio.id), corpo),
      await cliente(cen.adminB.cookie).post(url(g, id, retorno.id), corpo),
      await cliente(cen.adminB.cookie).post(url(cen.grupoB.id, id, retorno.id), corpo),
      await cliente(cen.adminA.cookie).post(url(g, id, 'abc'), corpo),
      await cliente(cen.adminA.cookie).post(url(g, 'abc', retorno.id), corpo),
    ]) {
      expect(r.status).toBe(404);
      expect(r.corpo).toEqual(inexistente.corpo);
    }
  });

  it('sem sessão 401 e sem X-Pelada 403', async () => {
    const db = await abrir();
    const { cen, g, id, retorno } = await cenario(db);
    const corpo = { retorno: d(-35) };
    expect((await cliente().post(url(g, id, retorno.id), corpo)).status).toBe(401);
    expect((await cliente(cen.adminA.cookie, true).post(url(g, id, retorno.id), corpo)).status).toBe(403);
  });
});
