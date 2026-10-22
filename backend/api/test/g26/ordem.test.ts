import { PESOS_PADRAO } from '@pelada/dominio';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as avaliacao from '../../src/aplicacao/elenco/avaliacao-periodos.js';
import { editarInicio } from '../../src/aplicacao/elenco/inicio-editar.js';
import { inativarJogador } from '../../src/aplicacao/elenco/inativar.js';
import { corrigirPeriodoDoJogador } from '../../src/aplicacao/elenco/periodos-corrigir.js';
import { reativarJogador } from '../../src/aplicacao/elenco/reativar.js';
import { editarPartida } from '../../src/aplicacao/partidas/editar.js';
import { lancarPartida } from '../../src/aplicacao/partidas/lancar.js';
import type { Db } from '../../src/infraestrutura/db/index.js';
import * as auditoria from '../../src/infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../src/infraestrutura/db/repositorios/jogadores.js';
import * as correcao from '../../src/infraestrutura/db/repositorios/periodos-corrigir.js';
import * as partidas from '../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../apoio/cenario-acesso.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarJogador } from '../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { AGORA_TESTE, diaRelativo as d, HOJE_TESTE } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

afterEach(() => vi.restoreAllMocks());

/** Entrada em d(-60) e saída em d(-45): o jogador está inativo. */
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
  const periodo = (await jogadores.buscar(db, g, id))?.periodos[0];
  return { g, id, periodoId: periodo!.id, autor: cen.adminA.id };
}

/** Espiona travar, a escrita e a auditoria; devolve a ordem de chamada e o executor de cada uma. */
function espionar(escrita: 'corrigirPeriodo' | 'reativar') {
  const travar = vi.spyOn(jogadores, 'travar');
  const gravar = escrita === 'reativar' ? vi.spyOn(jogadores, 'reativar') : vi.spyOn(correcao, 'corrigirPeriodo');
  const registrar = vi.spyOn(auditoria, 'registrar');
  return { travar, gravar, registrar };
}

const ordem = (...espioes: { mock: { invocationCallOrder: number[] } }[]) =>
  espioes.map((e) => e.mock.invocationCallOrder[0]!);

describe('PUT periodos (corrigir)', () => {
  it('trava o jogador, grava e audita na mesma transação, nessa ordem', async () => {
    const db = await abrir();
    const { g, id, periodoId, autor } = await cenario(db);
    const { travar, gravar, registrar } = espionar('corrigirPeriodo');

    const r = await corrigirPeriodoDoJogador(
      db,
      g,
      id,
      periodoId,
      { saida: d(-40) },
      { hoje: HOJE_TESTE, autor, agora: AGORA_TESTE },
    );

    expect(r.tipo).toBe('ok');
    const [t, w, a] = ordem(travar, gravar, registrar);
    expect(t).toBeLessThan(w!);
    expect(w).toBeLessThan(a!);
    const tx = travar.mock.calls[0]![0];
    expect(tx).not.toBe(db);
    expect(gravar.mock.calls[0]![0]).toBe(tx);
    expect(registrar.mock.calls[0]![0]).toBe(tx);
  });

  it('sem a auditoria a correção não vale: falha ao auditar desfaz a escrita', async () => {
    const db = await abrir();
    const { g, id, periodoId, autor } = await cenario(db);
    vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));

    await expect(
      corrigirPeriodoDoJogador(
        db,
        g,
        id,
        periodoId,
        { saida: d(-40) },
        { hoje: HOJE_TESTE, autor, agora: AGORA_TESTE },
      ),
    ).rejects.toThrow('auditoria fora');

    expect((await jogadores.buscar(db, g, id))?.periodos[0]?.fim).toBe(d(-45));
  });
});

describe('POST inativar', () => {
  it('trava o jogador, avalia e grava na mesma transação, nessa ordem', async () => {
    const db = await abrir();
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await pesos.criarPadrao(db, g, {
      pesos: PESOS_PADRAO,
      vigenteDesde: d(-400),
      registradoPor: cen.adminA.id,
      agora: AGORA_TESTE,
    });
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) });
    const travar = vi.spyOn(jogadores, 'travar');
    const avaliar = vi.spyOn(avaliacao, 'avaliarPedidoDePeriodos');
    const gravar = vi.spyOn(jogadores, 'inativar');

    const r = await inativarJogador(db, g, id, d(-10), HOJE_TESTE);

    expect(r.tipo).toBe('ok');
    const [t, a, w] = ordem(travar, avaliar, gravar);
    expect(t).toBeLessThan(a!);
    expect(a).toBeLessThan(w!);
    const tx = travar.mock.calls[0]![0];
    expect(tx).not.toBe(db);
    expect(avaliar.mock.calls[0]![0]).toBe(tx);
    expect(gravar.mock.calls[0]![0]).toBe(tx);
    expect((await jogadores.buscar(db, g, id))?.periodos[0]?.fim).toBe(d(-10));
  });
});

describe('POST reativar retroativo', () => {
  it('trava o jogador, grava e audita na mesma transação, nessa ordem', async () => {
    const db = await abrir();
    const { g, id, autor } = await cenario(db);
    const { travar, gravar, registrar } = espionar('reativar');

    const r = await reativarJogador(db, g, id, HOJE_TESTE, { dataRetorno: d(-20), autor, agora: AGORA_TESTE });

    expect(r.tipo).toBe('ok');
    const [t, w, a] = ordem(travar, gravar, registrar);
    expect(t).toBeLessThan(w!);
    expect(w).toBeLessThan(a!);
    const tx = travar.mock.calls[0]![0];
    expect(tx).not.toBe(db);
    expect(gravar.mock.calls[0]![0]).toBe(tx);
    expect(registrar.mock.calls[0]![0]).toBe(tx);
  });

  it('sem a auditoria o retorno retroativo não vale: falha ao auditar desfaz a escrita', async () => {
    const db = await abrir();
    const { g, id, autor } = await cenario(db);
    vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));

    await expect(
      reativarJogador(db, g, id, HOJE_TESTE, { dataRetorno: d(-20), autor, agora: AGORA_TESTE }),
    ).rejects.toThrow('auditoria fora');

    expect((await jogadores.buscar(db, g, id))?.periodos).toHaveLength(1);
  });
});

/** Grupo com três jogadores ativos; devolve os ids e as marcações em ordem inversa de id. */
async function cenarioPartida(db: Db) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: d(-400),
    registradoPor: cen.adminA.id,
    agora: AGORA_TESTE,
  });
  const ids = [
    await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) }),
    await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) }),
    await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) }),
  ];
  const marcacoes = [...ids]
    .sort()
    .reverse()
    .map((jogadorId) => ({ jogadorId, situacao: 'presente' as const }));
  const contexto = { autorContaId: cen.adminA.id, agora: AGORA_TESTE, hoje: HOJE_TESTE };
  return { g, ids, marcacoes, contexto };
}

/** Confere travas em ordem crescente de id, todas antes da gravação e no mesmo tx dela. */
function conferirTravas(
  db: Db,
  ids: string[],
  travar: { mock: { calls: unknown[][]; invocationCallOrder: number[] } },
  gravar: { mock: { calls: unknown[][]; invocationCallOrder: number[] } },
) {
  expect(travar.mock.calls.map((c) => c[2])).toEqual([...ids].sort());
  expect(Math.max(...travar.mock.invocationCallOrder)).toBeLessThan(gravar.mock.invocationCallOrder[0]!);
  const tx = travar.mock.calls[0]![0];
  expect(tx).not.toBe(db);
  travar.mock.calls.forEach((c) => expect(c[0]).toBe(tx));
  expect(gravar.mock.calls[0]![0]).toBe(tx);
}

describe('POST partida (lançar presença)', () => {
  it('trava os marcados em ordem de id, antes de gravar, na mesma transação', async () => {
    const db = await abrir();
    const { g, ids, marcacoes, contexto } = await cenarioPartida(db);
    const travar = vi.spyOn(jogadores, 'travar');
    const gravar = vi.spyOn(partidas, 'criar');

    await lancarPartida(db, g, { data: d(-5), choveu: false, marcacoes }, contexto);

    conferirTravas(db, ids, travar, gravar);
  });
});

describe('PUT partida (editar presença)', () => {
  it('trava os marcados em ordem de id, antes de gravar, na mesma transação', async () => {
    const db = await abrir();
    const { g, ids, marcacoes, contexto } = await cenarioPartida(db);
    await lancarPartida(db, g, { data: d(-5), choveu: false, marcacoes: marcacoes.slice(0, 1) }, contexto);
    const travar = vi.spyOn(jogadores, 'travar');
    const gravar = vi.spyOn(partidas, 'substituir');
    const registrar = vi.fn(auditoria.registrar);

    await editarPartida(db, g, d(-5), { choveu: true, marcacoes }, contexto, registrar);

    conferirTravas(db, ids, travar, gravar);
    expect(registrar.mock.calls[0]![0]).toBe(gravar.mock.calls[0]![0]);
    expect(Math.max(...travar.mock.invocationCallOrder)).toBeLessThan(registrar.mock.invocationCallOrder[0]!);
  });
});

describe('PUT inicio (editarInicio)', () => {
  async function cenarioAtivo(db: Db) {
    const cen = await montarCenario(db, fabrica);
    const g = cen.grupoA.id;
    await pesos.criarPadrao(db, g, {
      pesos: PESOS_PADRAO,
      vigenteDesde: d(-400),
      registradoPor: cen.adminA.id,
      agora: AGORA_TESTE,
    });
    const id = await criarJogador(db, g, cen.adminA.id, { dataEntrada: d(-60) });
    const antes = (await jogadores.buscar(db, g, id))?.inicioPontuacao;
    return { g, id, autor: cen.adminA.id, antes };
  }

  it('trava o jogador, grava e audita na mesma transação, nessa ordem', async () => {
    const db = await abrir();
    const { g, id, autor } = await cenarioAtivo(db);
    const travar = vi.spyOn(jogadores, 'travar');
    const gravar = vi.spyOn(jogadores, 'alterarInicio');
    const registrar = vi.spyOn(auditoria, 'registrar');

    const r = await editarInicio(db, g, id, d(-50), { hoje: HOJE_TESTE, autor, agora: AGORA_TESTE });

    expect(r).toMatchObject({ tipo: 'ok', alterado: true });
    const [t, w, a] = ordem(travar, gravar, registrar);
    expect(t).toBeLessThan(w!);
    expect(w).toBeLessThan(a!);
    const tx = travar.mock.calls[0]![0];
    expect(tx).not.toBe(db);
    expect(gravar.mock.calls[0]![0]).toBe(tx);
    expect(registrar.mock.calls[0]![0]).toBe(tx);
  });

  it('sem a auditoria a alteração não vale: falha ao auditar desfaz a escrita', async () => {
    const db = await abrir();
    const { g, id, autor, antes } = await cenarioAtivo(db);
    vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));

    await expect(editarInicio(db, g, id, d(-50), { hoje: HOJE_TESTE, autor, agora: AGORA_TESTE })).rejects.toThrow(
      'auditoria fora',
    );

    expect((await jogadores.buscar(db, g, id))?.inicioPontuacao).toBe(antes);
  });
});
