import { PESOS_PADRAO } from '@pelada/dominio';
import { sql } from 'kysely';
import { describe, expect, it } from 'vitest';
import { avaliarPedidoDePeriodos, type PedidoDePeriodos } from '../../../src/aplicacao/elenco/avaliacao-periodos.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { emTransacao, type Db } from '../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { contarConsultas } from '../../apoio/contar-consultas.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { criarPartida } from '../../apoio/fabricas/partidas.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { AGORA_TESTE, HOJE_TESTE, diaRelativo } from '../../apoio/relogio.js';
import { criarBase } from '../../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const hoje = HOJE_TESTE;
const d = (dias: number) => diaRelativo(dias);

async function comPesos(db: Db) {
  const base = await criarBase(db, fabrica);
  await pesos.criarPadrao(db, base.grupo.id, {
    pesos: PESOS_PADRAO,
    vigenteDesde: diaRelativo(-300),
    registradoPor: base.contaId,
    agora: AGORA_TESTE,
  });
  return base;
}

/** Jogador com entrada em -60, saída em -45 e retorno em -20 (aberto). */
async function cenario(db: Db) {
  const base = await comPesos(db);
  const jogador = await criarJogador(db, base.grupo.id, base.contaId, { dataEntrada: d(-60) });
  await jogadores.inativar(db, base.grupo.id, jogador, d(-45));
  await jogadores.reativar(db, base.grupo.id, jogador, d(-20));
  const periodos = (await jogadores.buscar(db, base.grupo.id, jogador))!.periodos;
  return { base, jogador, retorno: periodos[1]!, entrada: periodos[0]! };
}

async function contagens(db: Db) {
  const r = await sql<{ p: string; a: string; i: string }>`
    SELECT (SELECT count(*) FROM periodos_ativos)::text AS p,
           (SELECT count(*) FROM auditoria)::text AS a,
           (SELECT count(*) FROM jogadores WHERE inicio_pontuacao IS NOT NULL)::text AS i`.execute(kyselyDe(db));
  return r.rows[0];
}

class Desfazer extends Error {}

describe('avaliarPedidoDePeriodos', () => {
  it('recusa igual com db e com tx revertida, sem escrever nada', async () => {
    const db = await abrir();
    const { base, jogador, retorno } = await cenario(db);
    await criarPartida(db, base.grupo.id, d(-15), base.contaId, {
      presencas: [{ jogadorId: jogador, situacao: 'presente' }],
    });
    const pedido: PedidoDePeriodos = { operacao: 'corrigir', periodoId: retorno.id, retorno: d(-10) };
    const antes = await contagens(db);
    const pelaConexao = await avaliarPedidoDePeriodos(db, base.grupo.id, jogador, pedido, { hoje });
    let pelaTransacao: unknown;
    await emTransacao(db, async (tx) => {
      pelaTransacao = await avaliarPedidoDePeriodos(tx, base.grupo.id, jogador, pedido, { hoje });
      throw new Desfazer();
    }).catch((e: unknown) => {
      if (!(e instanceof Desfazer)) throw e;
    });
    expect(pelaConexao.tipo).toBe('recusa');
    expect(pelaConexao).toMatchObject({ campo: 'retorno' });
    expect((pelaConexao as { mensagem: string }).mensagem).toContain(
      `${d(-15).slice(8, 10)}/${d(-15).slice(5, 7)}/${d(-15).slice(0, 4)}`,
    );
    expect(pelaTransacao).toEqual(pelaConexao);
    expect(await contagens(db)).toEqual(antes);
  });

  it('usa no máximo 4 consultas', async () => {
    const db = await abrir();
    const { base, jogador, retorno } = await cenario(db);
    const total = await contarConsultas(() =>
      avaliarPedidoDePeriodos(
        db,
        base.grupo.id,
        jogador,
        { operacao: 'corrigir', periodoId: retorno.id, retorno: d(-35) },
        { hoje },
      ),
    );
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(4);
  });

  it('jogador de outro grupo e período de outro jogador são não encontrados', async () => {
    const db = await abrir();
    const { base, jogador, retorno } = await cenario(db);
    const alheio = await criarJogador(db, base.outroGrupo.id, base.contaId, { dataEntrada: d(-60) });
    const pedido: PedidoDePeriodos = { operacao: 'inativar', saida: d(-5) };
    expect(await avaliarPedidoDePeriodos(db, base.grupo.id, alheio, pedido, { hoje })).toEqual({
      tipo: 'nao_encontrado',
    });
    const outro = await criarJogador(db, base.grupo.id, base.contaId, { dataEntrada: d(-60) });
    const doutro: PedidoDePeriodos = { operacao: 'corrigir', periodoId: retorno.id, retorno: d(-35) };
    expect(await avaliarPedidoDePeriodos(db, base.grupo.id, outro, doutro, { hoje })).toEqual({
      tipo: 'nao_encontrado',
    });
    expect((await avaliarPedidoDePeriodos(db, base.grupo.id, jogador, doutro, { hoje })).tipo).toBe('ok');
  });

  it('retorno antecipado sobre rodadas sem presença: aviso singular e plural', async () => {
    const db = await abrir();
    const { base, jogador, retorno } = await cenario(db);
    const outro = await criarJogador(db, base.grupo.id, base.contaId, { dataEntrada: d(-60) });
    await criarPartida(db, base.grupo.id, d(-30), base.contaId, {
      presencas: [{ jogadorId: outro, situacao: 'presente' }],
    });
    const um = await avaliarPedidoDePeriodos(
      db,
      base.grupo.id,
      jogador,
      { operacao: 'corrigir', periodoId: retorno.id, retorno: d(-35) },
      { hoje },
    );
    expect(um.tipo).toBe('ok');
    if (um.tipo === 'ok') {
      expect(um.previa.rodadasQuePassamAConstar).toEqual([{ data: d(-30), situacao: 'falta' }]);
      expect(um.previa.aviso).toBe('Ela vale 0 ponto até você lançar a presença em Editar partida.');
      expect(um.periodos.find((p) => p.id === retorno.id)?.inicio).toBe(d(-35));
    }
    await criarPartida(db, base.grupo.id, d(-32), base.contaId, {
      presencas: [{ jogadorId: outro, situacao: 'presente' }],
    });
    const dois = await avaliarPedidoDePeriodos(
      db,
      base.grupo.id,
      jogador,
      { operacao: 'corrigir', periodoId: retorno.id, retorno: d(-35) },
      { hoje },
    );
    expect(dois.tipo === 'ok' && dois.previa.aviso).toBe(
      'Elas valem 0 ponto até você lançar a presença em Editar partida.',
    );
  });

  it('sem rodada que passe a constar o aviso é nulo', async () => {
    const db = await abrir();
    const { base, jogador, retorno } = await cenario(db);
    const r = await avaliarPedidoDePeriodos(
      db,
      base.grupo.id,
      jogador,
      { operacao: 'corrigir', periodoId: retorno.id, retorno: d(-25) },
      { hoje },
    );
    expect(r.tipo === 'ok' && r.previa.aviso).toBeNull();
    expect(r.tipo === 'ok' && r.previa.rodadasQuePassamAConstar).toEqual([]);
  });

  it('valores iguais viram nada_a_alterar, com prévia neutra', async () => {
    const db = await abrir();
    const { base, jogador, retorno } = await cenario(db);
    const r = await avaliarPedidoDePeriodos(
      db,
      base.grupo.id,
      jogador,
      { operacao: 'corrigir', periodoId: retorno.id, retorno: d(-20) },
      { hoje },
    );
    expect(r.tipo).toBe('nada_a_alterar');
    if (r.tipo === 'nada_a_alterar') {
      expect(r.previa.acumuladoAntes).toBe(r.previa.acumuladoDepois);
      expect(r.previa.posicaoAntes).toBe(r.previa.posicaoDepois);
      expect(r.previa.rodadasQuePassamAConstar).toEqual([]);
      expect(r.previa.rodadasQueDeixamDeConstar).toEqual([]);
      expect(r.previa.aviso).toBeNull();
    }
  });

  it('reativar e inativar passam pela mesma função', async () => {
    const db = await abrir();
    const base = await comPesos(db);
    const jogador = await criarJogador(db, base.grupo.id, base.contaId, { dataEntrada: d(-60) });
    const inativar = await avaliarPedidoDePeriodos(
      db,
      base.grupo.id,
      jogador,
      { operacao: 'inativar', saida: d(-45) },
      { hoje },
    );
    expect(inativar.tipo).toBe('ok');
    const futuro = await avaliarPedidoDePeriodos(
      db,
      base.grupo.id,
      jogador,
      { operacao: 'inativar', saida: d(5) },
      { hoje },
    );
    expect(futuro).toMatchObject({ tipo: 'recusa', campo: 'saida' });
    await jogadores.inativar(db, base.grupo.id, jogador, d(-45));
    const reativar = await avaliarPedidoDePeriodos(
      db,
      base.grupo.id,
      jogador,
      { operacao: 'reativar', dataRetorno: d(-20) },
      { hoje },
    );
    expect(reativar.tipo).toBe('ok');
    const antes = await avaliarPedidoDePeriodos(
      db,
      base.grupo.id,
      jogador,
      { operacao: 'reativar', dataRetorno: d(-50) },
      { hoje },
    );
    expect(antes).toMatchObject({ tipo: 'recusa', campo: 'dataRetorno' });
  });
});
