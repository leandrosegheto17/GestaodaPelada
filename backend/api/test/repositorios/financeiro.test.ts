import { totais } from '@pelada/dominio';
import pg from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { emTransacao } from '../../src/infraestrutura/db/index.js';
import * as financeiro from '../../src/infraestrutura/db/repositorios/financeiro.js';
import * as jogadores from '../../src/infraestrutura/db/repositorios/jogadores.js';
import { usarDb } from '../apoio/db-teste.js';
import { criarConfig, criarLancamento } from '../apoio/fabricas/financeiro.js';
import { criarJogador } from '../apoio/fabricas/jogadores.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase } from '../apoio/sql-dados.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = new Date('2026-10-16T12:00:00Z');

async function cenario() {
  const db = await abrir();
  const base = await criarBase(db, fabrica);
  return { db, base, a: base.grupo.id, b: base.outroGrupo.id, conta: base.contaId };
}

const mensalidade = { data: '2026-10-16', descricao: 'Mensalidade Ana 10/2026', valorCentavos: 7_500 };

describe('configuração', () => {
  it('lê vazio, salva, devolve a anterior ao salvar de novo e aceita mensalidade nula', async () => {
    const { db, a } = await cenario();
    expect(await financeiro.lerConfig(db, a)).toBeNull();
    const primeira = { mensalidadeCentavos: 7_500, saldoInicialCentavos: 35_000, dataSaldoInicial: '2026-02-05' };
    expect(await financeiro.salvarConfig(db, a, primeira)).toBeNull();
    const segunda = { mensalidadeCentavos: null, saldoInicialCentavos: -1_000, dataSaldoInicial: '2026-03-01' };
    expect(await financeiro.salvarConfig(db, a, segunda)).toEqual(primeira);
    expect(await financeiro.lerConfig(db, a)).toEqual(segunda);
  });

  it('a configuração de um grupo não aparece no outro', async () => {
    const { db, a, b } = await cenario();
    await criarConfig(db, a);
    expect(await financeiro.lerConfig(db, b)).toBeNull();
  });
});

describe('marcar e desmarcar', () => {
  it('marca com lançamento vinculado; a 2ª marcação falha e não deixa lançamento órfão', async () => {
    const { db, a, conta } = await cenario();
    const ana = await criarJogador(db, a, conta, { apelido: 'Ana' });
    const dados = { jogadorId: ana, mes: '2026-10', lancamento: mensalidade, autor: conta, agora: AGORA };
    const { lancamentoId } = await emTransacao(db, (tx) => financeiro.marcar(tx, a, dados));
    expect(lancamentoId).not.toBeNull();
    expect(await financeiro.pagamentosDoMes(db, a, '2026-10')).toEqual([{ jogadorId: ana, lancamentoId }]);
    await expect(emTransacao(db, (tx) => financeiro.marcar(tx, a, dados))).rejects.toBeInstanceOf(
      financeiro.PagamentoJaMarcado,
    );
    expect(await financeiro.lancamentosDoMes(db, a, '2026-10-01', '2026-10-31')).toHaveLength(1);
  });

  it('marca sem lançamento (mensalidade não configurada)', async () => {
    const { db, a, conta } = await cenario();
    const ana = await criarJogador(db, a, conta, { apelido: 'Ana' });
    const r = await emTransacao(db, (tx) =>
      financeiro.marcar(tx, a, { jogadorId: ana, mes: '2026-10', lancamento: null, autor: conta, agora: AGORA }),
    );
    expect(r.lancamentoId).toBeNull();
    expect(await financeiro.lancamentosDoMes(db, a, '2026-10-01', '2026-10-31')).toEqual([]);
  });

  it('desmarcar apaga o vinculado e devolve o que removeu; desmarcar o que não existe é null', async () => {
    const { db, a, conta } = await cenario();
    const ana = await criarJogador(db, a, conta, { apelido: 'Ana' });
    await emTransacao(db, (tx) =>
      financeiro.marcar(tx, a, { jogadorId: ana, mes: '2026-10', lancamento: mensalidade, autor: conta, agora: AGORA }),
    );
    const removido = await emTransacao(db, (tx) => financeiro.desmarcar(tx, a, ana, '2026-10'));
    expect(removido?.lancamento).toMatchObject({ descricao: 'Mensalidade Ana 10/2026', valorCentavos: 7_500 });
    expect(await financeiro.lancamentosDoMes(db, a, '2026-10-01', '2026-10-31')).toEqual([]);
    expect(await emTransacao(db, (tx) => financeiro.desmarcar(tx, a, ana, '2026-10'))).toBeNull();
  });

  it('jogador de outro grupo: JogadorNaoEncontrado e nada gravado', async () => {
    const { db, a, b, conta } = await cenario();
    const doB = await criarJogador(db, b, conta, { apelido: 'Alheio' });
    await expect(
      emTransacao(db, (tx) =>
        financeiro.marcar(tx, a, {
          jogadorId: doB,
          mes: '2026-10',
          lancamento: mensalidade,
          autor: conta,
          agora: AGORA,
        }),
      ),
    ).rejects.toBeInstanceOf(financeiro.JogadorNaoEncontrado);
    expect(await financeiro.lancamentosDoMes(db, a, '2026-10-01', '2026-10-31')).toEqual([]);
    expect(await financeiro.pagamentosDoMes(db, b, '2026-10')).toEqual([]);
  });
});

describe('mês e saldo', () => {
  it('lançamentos do mês: só o intervalo, do mais recente ao mais antigo, com "mensalidade" só no vinculado', async () => {
    const { db, a, conta } = await cenario();
    const ana = await criarJogador(db, a, conta, { apelido: 'Ana' });
    await criarLancamento(db, a, conta, { data: '2026-09-30', descricao: 'Fora do mês' });
    await criarLancamento(db, a, conta, { data: '2026-10-05', descricao: 'Aluguel' });
    await emTransacao(db, (tx) =>
      financeiro.marcar(tx, a, { jogadorId: ana, mes: '2026-10', lancamento: mensalidade, autor: conta, agora: AGORA }),
    );
    const lista = await financeiro.lancamentosDoMes(db, a, '2026-10-01', '2026-10-31');
    expect(lista.map((l) => [l.descricao, l.mensalidade])).toEqual([
      ['Mensalidade Ana 10/2026', true],
      ['Aluguel', false],
    ]);
  });

  it('totaisEntre com bordas inclusivas e igual à soma do domínio', async () => {
    const { db, a, conta } = await cenario();
    const lancamentos = [
      { tipo: 'entrada' as const, data: '2026-02-05', valorCentavos: 1_000 },
      { tipo: 'saida' as const, data: '2026-02-04', valorCentavos: 999 },
      { tipo: 'saida' as const, data: '2026-10-22', valorCentavos: 400 },
      { tipo: 'entrada' as const, data: '2026-10-23', valorCentavos: 5 },
    ];
    for (const l of lancamentos) await criarLancamento(db, a, conta, l);
    const soma = await financeiro.totaisEntre(db, a, '2026-02-05', '2026-10-22');
    expect(soma).toEqual({ entradasCentavos: 1_000, saidasCentavos: 400 });
    expect(soma).toEqual(totais(lancamentos.filter((l) => l.data >= '2026-02-05' && l.data <= '2026-10-22')));
    expect(await financeiro.totaisEntre(db, a, '2030-01-01', '2030-12-31')).toEqual({
      entradasCentavos: 0,
      saidasCentavos: 0,
    });
  });
});

describe('lançamentos', () => {
  it('busca traz quem alterou; editar devolve o anterior; excluir devolve o excluído', async () => {
    const { db, a, conta } = await cenario();
    const id = await criarLancamento(db, a, conta);
    const lido = await financeiro.buscarLancamento(db, a, id);
    expect(lido).toMatchObject({ descricao: 'Aluguel da quadra', mensalidade: false, alteradoPor: 'Conta de Teste' });
    const anterior = await financeiro.editarLancamento(
      db,
      a,
      id,
      { tipo: 'entrada', data: '2026-10-06', descricao: 'Patrocínio', valorCentavos: 12_300 },
      conta,
      AGORA,
    );
    expect(anterior?.descricao).toBe('Aluguel da quadra');
    expect(await financeiro.buscarLancamento(db, a, id)).toMatchObject({
      descricao: 'Patrocínio',
      valorCentavos: 12_300,
    });
    expect((await financeiro.excluirLancamento(db, a, id))?.descricao).toBe('Patrocínio');
    expect(await financeiro.buscarLancamento(db, a, id)).toBeNull();
  });

  it('excluir o lançamento vinculado a um pagamento lança LancamentoVinculado', async () => {
    const { db, a, conta } = await cenario();
    const ana = await criarJogador(db, a, conta, { apelido: 'Ana' });
    const { lancamentoId } = await emTransacao(db, (tx) =>
      financeiro.marcar(tx, a, { jogadorId: ana, mes: '2026-10', lancamento: mensalidade, autor: conta, agora: AGORA }),
    );
    await expect(financeiro.excluirLancamento(db, a, lancamentoId as string)).rejects.toBeInstanceOf(
      financeiro.LancamentoVinculado,
    );
    expect(await financeiro.buscarLancamento(db, a, lancamentoId as string)).not.toBeNull();
  });

  it('isolamento: lançamento do grupo B visto pelo A não existe nem é alterado', async () => {
    const { db, a, b, conta } = await cenario();
    const id = await criarLancamento(db, b, conta);
    const dados = { tipo: 'entrada' as const, data: '2026-10-06', descricao: 'Invasor', valorCentavos: 1 };
    expect(await financeiro.buscarLancamento(db, a, id)).toBeNull();
    expect(await financeiro.editarLancamento(db, a, id, dados, conta, AGORA)).toBeNull();
    expect(await financeiro.excluirLancamento(db, a, id)).toBeNull();
    expect(await financeiro.buscarLancamento(db, b, id)).toMatchObject({ descricao: 'Aluguel da quadra' });
  });
});

describe('histórico do jogador', () => {
  it('temHistorico é verdadeiro com só um pagamento', async () => {
    const { db, a, conta } = await cenario();
    const ana = await criarJogador(db, a, conta, { apelido: 'Ana' });
    expect(await jogadores.temHistorico(db, a, ana)).toBe(false);
    await emTransacao(db, (tx) =>
      financeiro.marcar(tx, a, { jogadorId: ana, mes: '2026-10', lancamento: null, autor: conta, agora: AGORA }),
    );
    expect(await jogadores.temHistorico(db, a, ana)).toBe(true);
  });
});

describe('consultas', () => {
  it('lancamentosDoMes com 5 lançamentos faz uma consulta só', async () => {
    const { db, a, conta } = await cenario();
    for (let i = 1; i <= 5; i += 1) {
      await criarLancamento(db, a, conta, { data: `2026-10-0${i}`, descricao: `Item ${i}` });
    }
    const consultas = vi.spyOn(pg.Client.prototype, 'query');
    try {
      expect(await financeiro.lancamentosDoMes(db, a, '2026-10-01', '2026-10-31')).toHaveLength(5);
      expect(consultas).toHaveBeenCalledTimes(1);
    } finally {
      consultas.mockRestore();
    }
  });

  it('marcar exige transação (não compila com o executor comum)', async () => {
    const { db, a, conta } = await cenario();
    const ana = await criarJogador(db, a, conta, { apelido: 'Ana' });
    const chamada = () =>
      // @ts-expect-error marcar só aceita Tx
      financeiro.marcar(db, a, { jogadorId: ana, mes: '2026-10', lancamento: null, autor: conta, agora: AGORA });
    expect(typeof chamada).toBe('function');
  });
});
