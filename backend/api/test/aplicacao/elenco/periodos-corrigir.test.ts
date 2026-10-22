import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it, vi } from 'vitest';
import { corrigirPeriodoDoJogador } from '../../../src/aplicacao/elenco/periodos-corrigir.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import type { Db } from '../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { AGORA_TESTE, diaRelativo as d, HOJE_TESTE } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

/** Entrada em d(-60), saída em d(-45), retorno em d(-20) (aberto). */
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
  const [entrada, retorno] = (await jogadores.buscar(db, g, id))?.periodos ?? [];
  const contexto = { hoje: HOJE_TESTE, autor: cen.adminA.id, agora: AGORA_TESTE };
  return { g, id, entrada: entrada!, retorno: retorno!, contexto };
}

const resumos = async (db: Db, g: string) =>
  (
    await kyselyDe(db)
      .selectFrom('auditoria')
      .select('resumo')
      .where('grupo_id', '=', g)
      .where('acao', '=', 'jogador_periodo_corrigido')
      .execute()
  ).map((e) => e.resumo as { saidaAnterior: string; saidaNova: string });

describe('corrigirPeriodoDoJogador', () => {
  it('dois pedidos ao mesmo tempo se enfileiram e o segundo parte do que o primeiro gravou', async () => {
    const db = await abrir();
    const { g, id, entrada, contexto } = await cenario(db);
    const outro = await abrir();
    const [a, b] = await Promise.all([
      corrigirPeriodoDoJogador(db, g, id, entrada.id, { saida: d(-40) }, contexto),
      corrigirPeriodoDoJogador(outro, g, id, entrada.id, { saida: d(-35) }, contexto),
    ]);
    expect([a.tipo, b.tipo]).toEqual(['ok', 'ok']);
    const final = (await jogadores.buscar(db, g, id))?.periodos[0]?.fim;
    const lista = await resumos(db, g);
    expect(lista).toHaveLength(2);
    const primeiro = lista.find((r) => r.saidaAnterior === d(-45));
    const segundo = lista.find((r) => r !== primeiro);
    expect(segundo?.saidaAnterior).toBe(primeiro?.saidaNova);
    expect(segundo?.saidaNova).toBe(final);
  });

  it('avalia dentro da transação e converte PeriodoInvalido do banco em recusa 422', async () => {
    const db = await abrir();
    const { g, id, entrada, contexto } = await cenario(db);
    const repo = await import('../../../src/infraestrutura/db/repositorios/periodos-corrigir.js');
    const espiao = vi.spyOn(repo, 'corrigirPeriodo').mockRejectedValueOnce(new jogadores.PeriodoInvalido());
    const r = await corrigirPeriodoDoJogador(db, g, id, entrada.id, { saida: d(-40) }, contexto);
    espiao.mockRestore();
    expect(r).toMatchObject({ tipo: 'invalida', campo: 'saida' });
    expect(await resumos(db, g)).toHaveLength(0);
    expect((await jogadores.buscar(db, g, id))?.periodos[0]?.fim).toBe(d(-45));
  });
});
