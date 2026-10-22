import { PESOS_PADRAO } from '@pelada/dominio';
import { describe, expect, it, vi } from 'vitest';
import { editarInicio } from '../../../src/aplicacao/elenco/inicio-editar.js';
import { previaInicio } from '../../../src/aplicacao/elenco/inicio-previa.js';
import { reativarJogador } from '../../../src/aplicacao/elenco/reativar.js';
import { kyselyDe } from '../../../src/infraestrutura/db/cliente.js';
import { emTransacao, type Db } from '../../../src/infraestrutura/db/index.js';
import * as auditoria from '../../../src/infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../../src/infraestrutura/db/repositorios/pesos.js';
import { montarCenario } from '../../apoio/cenario-acesso.js';
import { usarDb } from '../../apoio/db-teste.js';
import { criarJogador } from '../../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../../apoio/fabrica.js';
import { AGORA_TESTE, diaRelativo as d, HOJE_TESTE } from '../../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const HOJE = HOJE_TESTE;

/**
 * Vandré: entrada e início em d(-30), pontuação inicial 30, presenças em d(-20), d(-10) e d(-5).
 * Rivais: um com 40 pontos iniciais e uma presença antiga, outro com 20.
 */
async function cenario(db: Db) {
  const cen = await montarCenario(db, fabrica);
  const g = cen.grupoA.id;
  const autor = cen.adminA.id;
  await pesos.criarPadrao(db, g, {
    pesos: PESOS_PADRAO,
    vigenteDesde: d(-400),
    registradoPor: autor,
    agora: AGORA_TESTE,
  });
  const vandre = await criarJogador(db, g, autor, { apelido: 'Vandre', dataEntrada: d(-30), pontuacaoInicial: 30 });
  const rival1 = await criarJogador(db, g, autor, { apelido: 'Rival1', pontuacaoInicial: 40 });
  await criarJogador(db, g, autor, { apelido: 'Rival2', pontuacaoInicial: 20 });
  const lancar = (data: string, presentes: string[]) =>
    emTransacao(db, (tx) =>
      partidas.criar(tx, g, {
        data,
        choveu: false,
        presencas: presentes.map((jogadorId) => ({ jogadorId, situacao: 'presente' as const })),
        autor,
        agora: AGORA_TESTE,
      }),
    );
  await lancar(d(-50), [rival1]);
  for (const dia of [d(-20), d(-10), d(-5)]) await lancar(dia, [vandre]);
  const contexto = { hoje: HOJE, autor, agora: AGORA_TESTE };
  return { db, cen, g, autor, vandre, rival1, contexto };
}

const contagens = async (db: Db, g: string) => {
  const banco = kyselyDe(db);
  const total = async (tabela: 'jogadores' | 'periodos_ativos' | 'auditoria' | 'presencas' | 'partidas') =>
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
    jogadores: await total('jogadores'),
    periodos: await total('periodos_ativos'),
    auditoria: await total('auditoria'),
    presencas: await total('presencas'),
    partidas: await total('partidas'),
  };
};

const eventos = async (db: Db, g: string) =>
  kyselyDe(db)
    .selectFrom('auditoria')
    .select(['acao', 'entidade', 'entidade_id', 'resumo', 'autor_conta_id', 'momento'])
    .where('grupo_id', '=', g)
    .where('acao', '=', 'jogador_inicio_alterado')
    .execute();

const estado = async (db: Db, g: string, id: string) => {
  const j = await jogadores.buscar(db, g, id);
  return { inicio: j?.inicioPontuacao, periodos: j?.periodos.map(({ inicio, fim }) => ({ inicio, fim })) };
};

describe('previaInicio', () => {
  it('avançar: acumulado e posição caem e nada é gravado', async () => {
    const { db, g, vandre } = await cenario(await abrir());
    const antes = await contagens(db, g);
    const r = await previaInicio(db, g, vandre, d(-10), HOJE);
    expect(r).toEqual({
      tipo: 'ok',
      previa: {
        acumuladoAntes: 33,
        acumuladoDepois: 2,
        posicaoAntes: 2,
        posicaoDepois: 3,
        rodadasQuePassamAConstar: 0,
      },
    });
    expect(await contagens(db, g)).toEqual(antes);
    expect(await estado(db, g, vandre)).toEqual({ inicio: d(-30), periodos: [{ inicio: d(-30), fim: null }] });
  });

  it('recuar antes do início do período: as rodadas anteriores passam a constar e o acumulado não muda', async () => {
    const { db, g, vandre } = await cenario(await abrir());
    const r = await previaInicio(db, g, vandre, d(-60), HOJE);
    expect(r).toEqual({
      tipo: 'ok',
      previa: {
        acumuladoAntes: 33,
        acumuladoDepois: 33,
        posicaoAntes: 2,
        posicaoDepois: 2,
        rodadasQuePassamAConstar: 1,
      },
    });
  });

  it('datas inválidas, futuro e depois da saída do 1º período são recusados; outro grupo é não encontrado', async () => {
    const { db, cen, g, vandre } = await cenario(await abrir());
    await emTransacao(db, (tx) => jogadores.inativar(tx, g, vandre, d(-3)));
    const futuro = await previaInicio(db, g, vandre, d(1), HOJE);
    expect(futuro).toMatchObject({ tipo: 'invalida' });
    for (const antigo of ['0000-01-01', '0001-01-01', '1999-12-31']) {
      expect(await previaInicio(db, g, vandre, antigo, HOJE)).toMatchObject({ tipo: 'invalida' });
    }
    const depoisDaSaida = await previaInicio(db, g, vandre, d(-2), HOJE);
    expect(depoisDaSaida).toMatchObject({ tipo: 'invalida' });
    expect(await previaInicio(db, cen.grupoB.id, vandre, d(-10), HOJE)).toEqual({ tipo: 'nao_encontrado' });
  });
});

describe('editarInicio', () => {
  it('avançar grava S, não toca período nem presença e audita datas e acumulado, sem dado pessoal', async () => {
    const { db, g, autor, vandre, contexto } = await cenario(await abrir());
    const antes = await contagens(db, g);
    const r = await editarInicio(db, g, vandre, d(-10), contexto);
    expect(r).toEqual({ tipo: 'ok', inicio: d(-10), alterado: true });
    expect(await estado(db, g, vandre)).toEqual({ inicio: d(-10), periodos: [{ inicio: d(-30), fim: null }] });
    expect(await contagens(db, g)).toEqual({ ...antes, auditoria: antes.auditoria + 1 });
    const [evento, ...resto] = await eventos(db, g);
    expect(resto).toEqual([]);
    expect(evento).toMatchObject({
      entidade: 'jogador',
      entidade_id: vandre,
      autor_conta_id: autor,
      resumo: { anterior: d(-30), novo: d(-10), acumuladoAntes: 33, acumuladoDepois: 2 },
    });
    expect(JSON.stringify(evento)).not.toMatch(/Vandre|telefone/);
  });

  it('Kim: S = hoje zera a pontuação; voltar S devolve tudo', async () => {
    const { db, g, vandre, contexto } = await cenario(await abrir());
    await editarInicio(db, g, vandre, HOJE, contexto);
    expect(await previaInicio(db, g, vandre, d(-30), HOJE)).toMatchObject({
      previa: { acumuladoAntes: 0, acumuladoDepois: 33 },
    });
    await editarInicio(db, g, vandre, d(-30), contexto);
    const resumos = (await eventos(db, g)).map((e) => e.resumo);
    expect(resumos).toEqual([
      { anterior: d(-30), novo: HOJE, acumuladoAntes: 33, acumuladoDepois: 0 },
      { anterior: HOJE, novo: d(-30), acumuladoAntes: 0, acumuladoDepois: 33 },
    ]);
  });

  it('recuar antes do 1º período move só o início dele; período encerrado e saída ficam', async () => {
    const { db, g, autor, contexto } = await cenario(await abrir());
    const id = await criarJogador(db, g, autor, { apelido: 'Dois', dataEntrada: d(-100) });
    await emTransacao(db, async (tx) => {
      await jogadores.inativar(tx, g, id, d(-90));
      await jogadores.reativar(tx, g, id, d(-20));
    });
    expect(await editarInicio(db, g, id, d(-120), contexto)).toEqual({ tipo: 'ok', inicio: d(-120), alterado: true });
    expect(await estado(db, g, id)).toEqual({
      inicio: d(-120),
      periodos: [
        { inicio: d(-120), fim: d(-90) },
        { inicio: d(-20), fim: null },
      ],
    });
    // Avançar até a saída do 1º período vale; passar dela é recusado e nada muda.
    expect(await editarInicio(db, g, id, d(-95), contexto)).toMatchObject({ tipo: 'ok' });
    const antes = await contagens(db, g);
    expect(await editarInicio(db, g, id, d(-80), contexto)).toMatchObject({ tipo: 'invalida' });
    expect(await contagens(db, g)).toEqual(antes);
    expect((await estado(db, g, id)).inicio).toBe(d(-95));
  });

  it('recuar dentro do 1º período não mexe nos períodos', async () => {
    const { db, g, autor, contexto } = await cenario(await abrir());
    const id = await criarJogador(db, g, autor, { apelido: 'Dentro', dataEntrada: d(-100) });
    await editarInicio(db, g, id, d(-40), contexto);
    await editarInicio(db, g, id, d(-70), contexto);
    expect(await estado(db, g, id)).toEqual({ inicio: d(-70), periodos: [{ inicio: d(-100), fim: null }] });
  });

  it('data igual à atual: nada gravado, sem auditoria, alterado_em intacto', async () => {
    const { db, g, vandre, contexto } = await cenario(await abrir());
    const lerAlterado = async () =>
      (
        await kyselyDe(db)
          .selectFrom('jogadores')
          .select('alterado_em')
          .where('id', '=', vandre)
          .executeTakeFirstOrThrow()
      ).alterado_em;
    const antes = await lerAlterado();
    const depois = { ...contexto, agora: new Date(AGORA_TESTE.getTime() + 3_600_000) };
    expect(await editarInicio(db, g, vandre, d(-30), depois)).toEqual({ tipo: 'ok', inicio: d(-30), alterado: false });
    expect(await eventos(db, g)).toEqual([]);
    expect(await lerAlterado()).toEqual(antes);
  });

  it('S ainda nulo vale o início do 1º período: igual a ele não grava', async () => {
    const { db, g, vandre, contexto } = await cenario(await abrir());
    await kyselyDe(db).updateTable('jogadores').set({ inicio_pontuacao: null }).where('id', '=', vandre).execute();
    expect(await editarInicio(db, g, vandre, d(-30), contexto)).toEqual({
      tipo: 'ok',
      inicio: d(-30),
      alterado: false,
    });
    expect((await estado(db, g, vandre)).inicio).toBeNull();
    expect(await eventos(db, g)).toEqual([]);
  });

  it('futuro é recusado sem gravar', async () => {
    const { db, g, vandre, contexto } = await cenario(await abrir());
    const antes = await contagens(db, g);
    expect(await editarInicio(db, g, vandre, d(1), contexto)).toMatchObject({ tipo: 'invalida' });
    expect(await contagens(db, g)).toEqual(antes);
    expect((await estado(db, g, vandre)).inicio).toBe(d(-30));
  });

  it('outro grupo: não encontrado e nada gravado', async () => {
    const { db, cen, g, vandre, contexto } = await cenario(await abrir());
    const antes = await contagens(db, g);
    expect(await editarInicio(db, cen.grupoB.id, vandre, d(-10), contexto)).toEqual({ tipo: 'nao_encontrado' });
    expect(await contagens(db, g)).toEqual(antes);
    expect((await estado(db, g, vandre)).inicio).toBe(d(-30));
  });

  it('falha na auditoria desfaz S e o início do período', async () => {
    const { db, g, vandre, contexto } = await cenario(await abrir());
    const espiao = vi.spyOn(auditoria, 'registrar').mockRejectedValueOnce(new Error('auditoria fora'));
    await expect(editarInicio(db, g, vandre, d(-60), contexto)).rejects.toThrow('auditoria fora');
    espiao.mockRestore();
    expect(await estado(db, g, vandre)).toEqual({ inicio: d(-30), periodos: [{ inicio: d(-30), fim: null }] });
  });

  it('reativar não muda S nem pontos (RN-29)', async () => {
    const { db, g, vandre, contexto } = await cenario(await abrir());
    await editarInicio(db, g, vandre, d(-10), contexto);
    await emTransacao(db, (tx) => jogadores.inativar(tx, g, vandre, d(-2)));
    expect(await reativarJogador(db, g, vandre, HOJE)).toMatchObject({ tipo: 'ok' });
    expect((await estado(db, g, vandre)).inicio).toBe(d(-10));
    expect(await previaInicio(db, g, vandre, d(-10), HOJE)).toMatchObject({
      previa: { acumuladoAntes: 2, acumuladoDepois: 2 },
    });
  });

  it('dois pedidos ao mesmo tempo mantêm a invariante e encadeiam a auditoria', async () => {
    const { db, g, vandre, contexto } = await cenario(await abrir());
    const outro = await abrir();
    const [a, b] = await Promise.all([
      editarInicio(db, g, vandre, d(-60), contexto),
      editarInicio(outro, g, vandre, d(-10), contexto),
    ]);
    expect([a.tipo, b.tipo]).toEqual(['ok', 'ok']);
    const final = await estado(db, g, vandre);
    expect(final.periodos?.[0]?.inicio && final.inicio && final.periodos[0].inicio <= final.inicio).toBe(true);
    const resumos = (await eventos(db, g)).map((e) => e.resumo as { anterior: string; novo: string });
    const primeiro = resumos.find((r) => r.anterior === d(-30));
    const segundo = resumos.find((r) => r !== primeiro);
    expect(resumos).toHaveLength(2);
    expect(segundo?.anterior).toBe(primeiro?.novo);
    expect(segundo?.novo).toBe(final.inicio);
  });
});
