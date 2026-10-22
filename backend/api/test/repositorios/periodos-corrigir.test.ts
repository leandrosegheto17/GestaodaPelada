import { describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';
import { embrulhar } from '../../src/infraestrutura/db/cliente.js';
import type { TabelasBanco } from '../../src/infraestrutura/db/tipos.js';
import { JaAtivo, PeriodoInvalido } from '../../src/infraestrutura/db/repositorios/jogadores.js';
import * as jogadores from '../../src/infraestrutura/db/repositorios/jogadores.js';
import { corrigirPeriodo } from '../../src/infraestrutura/db/repositorios/periodos-corrigir.js';
import { emTransacao } from '../../src/infraestrutura/db/index.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarJogador } from '../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';
import { diaRelativo as d } from '../apoio/relogio.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);

async function jogadorComDoisPeriodos(db: Awaited<ReturnType<typeof abrir>>) {
  const base = await criarBase(db, fabrica);
  const id = await criarJogador(db, base.grupo.id, base.contaId, { dataEntrada: d(-300) });
  await jogadores.inativar(db, base.grupo.id, id, d(-200));
  await jogadores.reativar(db, base.grupo.id, id, d(-150));
  const periodos = (await jogadores.buscar(db, base.grupo.id, id))?.periodos ?? [];
  return { base, id, fechado: periodos[0]!, aberto: periodos[1]! };
}

describe('corrigirPeriodo', () => {
  it('buscar devolve o id de cada período, em ordem cronológica', async () => {
    const db = await abrir();
    const { fechado, aberto } = await jogadorComDoisPeriodos(db);
    expect(fechado).toEqual({ id: expect.any(String), inicio: d(-300), fim: d(-200) });
    expect(aberto).toEqual({ id: expect.any(String), inicio: d(-150), fim: null });
    expect(fechado.id).not.toBe(aberto.id);
  });

  it('corrige só o fim, só o início ou os dois; o outro campo fica intacto', async () => {
    const db = await abrir();
    const { base, id, fechado } = await jogadorComDoisPeriodos(db);
    const g = base.grupo.id;
    const ler = async () => (await jogadores.buscar(db, g, id))?.periodos[0];
    const corrigir = (p: { inicio?: string; fim?: string }) =>
      emTransacao(db, (tx) => corrigirPeriodo(tx, g, id, fechado.id, p));
    expect(await corrigir({ fim: d(-180) })).toBe('ok');
    expect(await ler()).toEqual({ id: fechado.id, inicio: d(-300), fim: d(-180) });
    expect(await corrigir({ inicio: d(-310) })).toBe('ok');
    expect(await ler()).toEqual({ id: fechado.id, inicio: d(-310), fim: d(-180) });
    expect(await corrigir({ inicio: d(-320), fim: d(-190) })).toBe('ok');
    expect(await ler()).toEqual({ id: fechado.id, inicio: d(-320), fim: d(-190) });
    expect(await corrigir({})).toBe('ok');
    expect(await ler()).toEqual({ id: fechado.id, inicio: d(-320), fim: d(-190) });
  });

  it('período de outro jogador, de outro grupo ou inexistente: nao_encontrado e nada muda', async () => {
    const db = await abrir();
    const { base, id, fechado } = await jogadorComDoisPeriodos(db);
    const g = base.grupo.id;
    const outroNoGrupo = await criarJogador(db, g, base.contaId, { dataEntrada: d(-300) });
    const homonimo = await criarJogador(db, base.outroGrupo.id, base.contaId, {
      apelido: 'Mesmo',
      dataEntrada: d(-300),
    });
    const doOutro = (await jogadores.buscar(db, g, outroNoGrupo))?.periodos[0]?.id ?? '';
    const tentar = (grupo: string, jog: string, per: string) =>
      emTransacao(db, (tx) => corrigirPeriodo(tx, grupo, jog, per, { fim: d(-100), inicio: d(-290) }));
    expect(await tentar(g, id, doOutro)).toBe('nao_encontrado');
    expect(await tentar(base.outroGrupo.id, id, fechado.id)).toBe('nao_encontrado');
    expect(await tentar(base.outroGrupo.id, homonimo, fechado.id)).toBe('nao_encontrado');
    expect(await tentar(g, id, '00000000-0000-0000-0000-000000000000')).toBe('nao_encontrado');
    expect(await emTransacao(db, (tx) => corrigirPeriodo(tx, g, id, doOutro, {}))).toBe('nao_encontrado');
    expect((await jogadores.buscar(db, g, id))?.periodos[0]).toEqual({ id: fechado.id, inicio: d(-300), fim: d(-200) });
    expect((await jogadores.buscar(db, g, outroNoGrupo))?.periodos[0]).toMatchObject({ inicio: d(-300), fim: null });
    expect((await jogadores.buscar(db, base.outroGrupo.id, homonimo))?.periodos[0]).toMatchObject({
      inicio: d(-300),
      fim: null,
    });
  });

  it('fim anterior ao início vira PeriodoInvalido', async () => {
    const db = await abrir();
    const { base, id, fechado } = await jogadorComDoisPeriodos(db);
    await expect(
      emTransacao(db, (tx) => corrigirPeriodo(tx, base.grupo.id, id, fechado.id, { fim: d(-301) })),
    ).rejects.toBeInstanceOf(PeriodoInvalido);
    await expect(
      emTransacao(db, (tx) => corrigirPeriodo(tx, base.grupo.id, id, fechado.id, { inicio: d(-100) })),
    ).rejects.toBeInstanceOf(PeriodoInvalido);
  });

  describe('mapeamento de constraints do banco', () => {
    function executorQueFalhaCom(erro: unknown) {
      const cadeia: Record<string, unknown> = {};
      for (const m of ['set', 'where']) cadeia[m] = () => cadeia;
      cadeia.executeTakeFirst = () => Promise.reject(erro);
      return embrulhar({ updateTable: () => cadeia } as unknown as Kysely<TabelasBanco>, true);
    }
    const corrigir = (erro: unknown) =>
      corrigirPeriodo(executorQueFalhaCom(erro), 'g', 'j', 'p', { fim: '2026-01-01' });

    it('periodos_um_aberto vira JaAtivo', async () => {
      await expect(corrigir({ constraint: 'periodos_um_aberto' })).rejects.toBeInstanceOf(JaAtivo);
    });

    it('periodo_fim_depois_inicio vira PeriodoInvalido', async () => {
      await expect(corrigir({ constraint: 'periodo_fim_depois_inicio' })).rejects.toBeInstanceOf(PeriodoInvalido);
    });

    it('outro erro é repassado sem mapeamento', async () => {
      const erro = new Error('falha qualquer');
      await expect(corrigir(erro)).rejects.toBe(erro);
    });
  });
});
