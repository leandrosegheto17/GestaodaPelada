import { describe, expect, it, vi } from 'vitest';
import { kyselyDe } from '../../src/infraestrutura/db/cliente.js';
import {
  ApelidoEmUso,
  JaAtivo,
  JogadorComHistorico,
  PeriodoInvalido,
} from '../../src/infraestrutura/db/repositorios/jogadores.js';
import * as jogadores from '../../src/infraestrutura/db/repositorios/jogadores.js';
import { emTransacao } from '../../src/infraestrutura/db/index.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarJogador } from '../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';
import { executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');

const dados = (apelido: string) => ({
  apelido,
  anoNascimento: 1980,
  posicao: 'atacante',
  telefone: null,
  dataEntrada: '2026-02-05',
  autor: '',
  agora: AGORA,
});

describe('repositório de jogadores', () => {
  it('criar traz um período aberto; apelido repetido sem caixa vira ApelidoEmUso; outro grupo aceita', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const id = await emTransacao(db, (tx) =>
      jogadores.criar(tx, base.grupo.id, { ...dados('Toninho'), autor: base.contaId }),
    );
    expect(await jogadores.buscar(db, base.grupo.id, id)).toMatchObject({
      apelido: 'Toninho',
      periodos: [{ inicio: '2026-02-05', fim: null }],
    });
    await expect(
      emTransacao(db, (tx) => jogadores.criar(tx, base.grupo.id, { ...dados('TONINHO'), autor: base.contaId })),
    ).rejects.toBeInstanceOf(ApelidoEmUso);
    await expect(
      emTransacao(db, (tx) => jogadores.criar(tx, base.outroGrupo.id, { ...dados('Toninho'), autor: base.contaId })),
    ).resolves.toBeTypeOf('string');
  });

  it('buscar e listar respeitam o grupo', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const id = await criarJogador(db, base.grupo.id, base.contaId, { apelido: 'Alfa' });
    await criarJogador(db, base.outroGrupo.id, base.contaId, { apelido: 'Beta' });
    expect(await jogadores.buscar(db, base.outroGrupo.id, id)).toBeNull();
    expect((await jogadores.listar(db, base.grupo.id)).map((j) => j.apelido)).toEqual(['Alfa']);
  });

  it('editar muda os dados e move só o primeiro período; data depois do fim é PeriodoInvalido', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const id = await criarJogador(db, base.grupo.id, base.contaId, { dataEntrada: '2026-02-05' });
    await jogadores.inativar(db, base.grupo.id, id, '2026-03-01');
    await jogadores.reativar(db, base.grupo.id, id, '2026-04-01');
    const novo = {
      apelido: 'Novo Nome',
      anoNascimento: 1981,
      posicao: 'goleiro',
      telefone: '11987654321',
      autor: base.contaId,
      agora: AGORA,
    };
    const editar = (grupoId: string, extra: { dataEntrada?: string } = {}) =>
      emTransacao(db, (tx) => jogadores.editar(tx, grupoId, id, { ...novo, ...extra }));
    expect(await editar(base.grupo.id, { dataEntrada: '2026-02-10' })).toBe(true);
    const j = await jogadores.buscar(db, base.grupo.id, id);
    expect(j).toMatchObject({ apelido: 'Novo Nome', posicao: 'goleiro', telefone: '11987654321' });
    expect(j?.periodos).toEqual([
      { inicio: '2026-02-10', fim: '2026-03-01' },
      { inicio: '2026-04-01', fim: null },
    ]);
    await expect(editar(base.grupo.id, { dataEntrada: '2026-03-02' })).rejects.toBeInstanceOf(PeriodoInvalido);
    expect(await editar(base.outroGrupo.id)).toBe(false);
    expect((await jogadores.buscar(db, base.grupo.id, id))?.apelido).toBe('Novo Nome');
  });

  it('com id de outro grupo: inativar, excluir e temHistorico não tocam o jogador; sem Tx não compila', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const id = await criarJogador(db, base.grupo.id, base.contaId);
    expect(await jogadores.inativar(db, base.outroGrupo.id, id, '2026-06-01')).toBe('sem_periodo_aberto');
    expect(await emTransacao(db, (tx) => jogadores.excluir(tx, base.outroGrupo.id, id))).toBe(false);
    expect(await jogadores.temHistorico(db, base.outroGrupo.id, id)).toBe(false);
    expect((await jogadores.buscar(db, base.grupo.id, id))?.periodos).toEqual([{ inicio: '2026-01-01', fim: null }]);
    // @ts-expect-error criar exige Tx
    void jogadores.criar(db, base.grupo.id, { ...dados('SemTx'), autor: base.contaId }).catch(() => undefined);
  });

  it('listar usa uma consulta só, com os períodos de cada jogador', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    for (const apelido of ['Um', 'Dois', 'Tres']) {
      const id = await criarJogador(db, base.grupo.id, base.contaId, { apelido, dataEntrada: '2026-01-01' });
      await jogadores.inativar(db, base.grupo.id, id, '2026-02-01');
      await jogadores.reativar(db, base.grupo.id, id, '2026-03-01');
    }
    const espiao = vi.spyOn(kyselyDe(db).getExecutor(), 'executeQuery');
    const lista = await jogadores.listar(db, base.grupo.id);
    expect(espiao).toHaveBeenCalledTimes(1);
    espiao.mockRestore();
    expect(lista).toHaveLength(3);
    expect(lista.every((j) => j.periodos.length === 2)).toBe(true);
  });

  it('inativar fecha o aberto; de novo não há período aberto; reativar abre outro e não aceita já ativo', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const id = await criarJogador(db, base.grupo.id, base.contaId, { dataEntrada: '2026-02-05' });
    expect(await jogadores.inativar(db, base.grupo.id, id, '2026-03-01')).toBe('ok');
    expect(await jogadores.inativar(db, base.grupo.id, id, '2026-03-02')).toBe('sem_periodo_aberto');
    expect(await jogadores.reativar(db, base.grupo.id, id, '2026-02-20')).toBeNull();
    expect(await jogadores.reativar(db, base.grupo.id, id, '2026-04-01')).toBeTypeOf('string');
    await expect(jogadores.reativar(db, base.grupo.id, id, '2026-05-01')).rejects.toBeInstanceOf(JaAtivo);
    expect((await jogadores.buscar(db, base.grupo.id, id))?.periodos).toHaveLength(2);
    await expect(jogadores.inativar(db, base.grupo.id, id, '2026-03-15')).rejects.toBeInstanceOf(PeriodoInvalido);
    expect(await jogadores.reativar(db, base.outroGrupo.id, id, '2026-06-01')).toBeNull();
  });

  it('temHistorico (presença ou nota) e excluir', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const livre = await criarJogador(db, base.grupo.id, base.contaId);
    const comNota = await criarJogador(db, base.grupo.id, base.contaId);
    expect(await jogadores.temHistorico(db, base.grupo.id, livre)).toBe(false);
    const hab = await executarSql<{ id: string }>(
      "INSERT INTO habilidades (grupo_id, nome) VALUES ($1, 'Passe') RETURNING id",
      [base.grupo.id],
    );
    await executarSql('INSERT INTO notas (jogador_id, habilidade_id, grupo_id, valor) VALUES ($1, $2, $3, 7)', [
      comNota,
      hab[0]?.id,
      base.grupo.id,
    ]);
    expect(await jogadores.temHistorico(db, base.grupo.id, comNota)).toBe(true);
    await expect(emTransacao(db, (tx) => jogadores.excluir(tx, base.grupo.id, comNota))).rejects.toBeInstanceOf(
      JogadorComHistorico,
    );
    expect(await emTransacao(db, (tx) => jogadores.excluir(tx, base.grupo.id, livre))).toBe(true);
    expect(await jogadores.buscar(db, base.grupo.id, livre)).toBeNull();
    expect(await executarSql('SELECT 1 FROM periodos_ativos WHERE jogador_id = $1', [livre])).toEqual([]);
  });

  it('temPresencaAntesDe', async () => {
    const db = await abrir();
    const base = await criarBase(db, fabrica);
    const id = await criarJogador(db, base.grupo.id, base.contaId);
    const partida = await executarSql<{ id: string }>(
      `INSERT INTO partidas (grupo_id, data, criada_por, criada_em, alterada_por, alterada_em)
       VALUES ($1, '2026-03-05', $2, $3, $2, $3) RETURNING id`,
      [base.grupo.id, base.contaId, AGORA],
    );
    await executarSql(
      "INSERT INTO presencas (partida_id, jogador_id, grupo_id, situacao) VALUES ($1, $2, $3, 'presente')",
      [partida[0]?.id, id, base.grupo.id],
    );
    expect(await jogadores.temPresencaAntesDe(db, base.grupo.id, id, '2026-03-06')).toBe(true);
    expect(await jogadores.temPresencaAntesDe(db, base.grupo.id, id, '2026-03-05')).toBe(false);
  });
});
