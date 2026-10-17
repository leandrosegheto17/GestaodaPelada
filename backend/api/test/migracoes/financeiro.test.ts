import { describe, expect, it } from 'vitest';
import { usarDb } from '../apoio/db-teste.js';
import { usarFabrica } from '../apoio/fabrica.js';
import { criarBase, inserirJogador } from '../apoio/sql-dados.js';
import { codigoDoErro, executarSql } from '../apoio/sql.js';

const fabrica = usarFabrica();
const abrir = usarDb(fabrica);
const AGORA = '2026-10-16T12:00:00Z';

async function cenario() {
  const db = await abrir();
  const base = await criarBase(db, fabrica);
  const grupos = [base.grupo.id, base.outroGrupo.id];
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM pagamentos_mes WHERE grupo_id = ANY($1)', [grupos]);
    await executarSql('DELETE FROM lancamentos WHERE grupo_id = ANY($1)', [grupos]);
    await executarSql('DELETE FROM config_financeira WHERE grupo_id = ANY($1)', [grupos]);
  });
  return { base, conta: base.contaId };
}

const config = (grupoId: string, mensalidade: number | null, saldo: number) =>
  executarSql(
    'INSERT INTO config_financeira (grupo_id, mensalidade_centavos, saldo_inicial_centavos, data_saldo_inicial) VALUES ($1, $2, $3, $4)',
    [grupoId, mensalidade, saldo, '2026-02-05'],
  );

async function lancamento(
  grupoId: string,
  conta: string,
  campos: { tipo?: string; descricao?: string; valor?: number } = {},
) {
  const linhas = await executarSql<{ id: string }>(
    `INSERT INTO lancamentos (grupo_id, tipo, data, descricao, valor_centavos, criado_por, criado_em, alterado_por, alterado_em)
     VALUES ($1, $2, '2026-10-05', $3, $4, $5, $6, $5, $6) RETURNING id`,
    [grupoId, campos.tipo ?? 'saida', campos.descricao ?? 'Aluguel', campos.valor ?? 80_000, conta, AGORA],
  );
  return linhas[0]?.id as string;
}

const pagamento = (
  grupoId: string,
  jogadorId: string,
  conta: string,
  mes: string,
  lancamentoId: string | null = null,
) =>
  executarSql(
    'INSERT INTO pagamentos_mes (grupo_id, jogador_id, mes, lancamento_id, marcado_por, marcado_em) VALUES ($1, $2, $3, $4, $5, $6)',
    [grupoId, jogadorId, mes, lancamentoId, conta, AGORA],
  );

describe('migração do financeiro: configuração', () => {
  it('uma por grupo; mensalidade nula aceita; limites de mensalidade e saldo', async () => {
    const { base } = await cenario();
    expect(await codigoDoErro(config(base.grupo.id, null, 35_000))).toBeNull();
    expect(await codigoDoErro(config(base.grupo.id, 7_500, 0))).toBe('23505');
    for (const [mensalidade, saldo, codigo] of [
      [0, 0, '23514'],
      [100_000_000, 0, '23514'],
      [7_500, -100_000_000, '23514'],
      [7_500, -99_999_999, null],
    ] as const) {
      expect(await codigoDoErro(config(base.outroGrupo.id, mensalidade, saldo))).toBe(codigo);
      await executarSql('DELETE FROM config_financeira WHERE grupo_id = $1', [base.outroGrupo.id]);
    }
  });
});

describe('migração do financeiro: lançamentos', () => {
  it.each([
    ['valor 0', { valor: 0 }],
    ['descrição só com espaços', { descricao: '  ' }],
    ['descrição de 81 caracteres', { descricao: 'x'.repeat(81) }],
    ['tipo desconhecido', { tipo: 'transferencia' }],
  ])('%s é recusado', async (_, campos) => {
    const { base, conta } = await cenario();
    expect(await codigoDoErro(lancamento(base.grupo.id, conta, campos))).toBe('23514');
  });

  it('lançamento válido é aceito', async () => {
    const { base, conta } = await cenario();
    expect(
      await codigoDoErro(lancamento(base.grupo.id, conta, { descricao: 'x'.repeat(80), valor: 99_999_999 })),
    ).toBeNull();
  });
});

describe('migração do financeiro: pagamentos', () => {
  it('um por jogador e mês; mês malformado recusado; outro mês aceito', async () => {
    const { base, conta } = await cenario();
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Pagador');
    expect(await codigoDoErro(pagamento(base.grupo.id, jogador, conta, '2026-10'))).toBeNull();
    expect(await codigoDoErro(pagamento(base.grupo.id, jogador, conta, '2026-10'))).toBe('23505');
    expect(await codigoDoErro(pagamento(base.grupo.id, jogador, conta, '2026-11'))).toBeNull();
    for (const mes of ['2026-13', '2026-1']) {
      expect(await codigoDoErro(pagamento(base.grupo.id, jogador, conta, mes))).toBe('23514');
    }
  });

  it('jogador ou lançamento de outro grupo violam a chave estrangeira', async () => {
    const { base, conta } = await cenario();
    const doOutro = await inserirJogador(fabrica, base, base.outroGrupo.id, 'Alheio');
    const lancamentoDoOutro = await lancamento(base.outroGrupo.id, conta);
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Pagador');
    expect(await codigoDoErro(pagamento(base.grupo.id, doOutro, conta, '2026-10'))).toBe('23503');
    expect(await codigoDoErro(pagamento(base.grupo.id, jogador, conta, '2026-10', lancamentoDoOutro))).toBe('23503');
  });

  it('o mesmo lançamento não vale para dois pagamentos', async () => {
    const { base, conta } = await cenario();
    const a = await inserirJogador(fabrica, base, base.grupo.id, 'Ana');
    const b = await inserirJogador(fabrica, base, base.grupo.id, 'Beto');
    const id = await lancamento(base.grupo.id, conta, { tipo: 'entrada', valor: 7_500 });
    expect(await codigoDoErro(pagamento(base.grupo.id, a, conta, '2026-10', id))).toBeNull();
    expect(await codigoDoErro(pagamento(base.grupo.id, b, conta, '2026-10', id))).toBe('23505');
  });

  it('apagar o lançamento vinculado ou o jogador com pagamento é recusado', async () => {
    const { base, conta } = await cenario();
    const jogador = await inserirJogador(fabrica, base, base.grupo.id, 'Pagador');
    const id = await lancamento(base.grupo.id, conta, { tipo: 'entrada', valor: 7_500 });
    await pagamento(base.grupo.id, jogador, conta, '2026-10', id);
    expect(await codigoDoErro(executarSql('DELETE FROM lancamentos WHERE id = $1', [id]))).toBe('23503');
    expect(await codigoDoErro(executarSql('DELETE FROM jogadores WHERE id = $1', [jogador]))).toBe('23503');
  });
});
