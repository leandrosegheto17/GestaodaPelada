import { describe, expect, it } from 'vitest';
import {
  configFinanceiraCorpo,
  erroPadrao,
  erroSemPermissaoFinanceiro,
  lancamento,
  lancamentoCorpo,
  marcarPagamentoCorpo,
  mesFinanceiro,
  pagamentoParametros,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

describe('respostas do mockup', () => {
  it.each(respostas(/^financeiro-.*\.json$/))('$nome passa em mesFinanceiro', ({ json }) => {
    expect(mesFinanceiro.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^lancamento-.*\.json$/))('$nome passa em lancamento', ({ json }) => {
    expect(lancamento.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^erro-validacao-(lancamento|config)\.json$/))('$nome passa no erro padrão', ({ json }) => {
    expect(erroPadrao.safeParse(json).success).toBe(true);
  });
  it('erro-sem-permissao passa em erroSemPermissaoFinanceiro', () => {
    const [arquivo] = respostas(/^erro-sem-permissao\.json$/);
    expect(erroSemPermissaoFinanceiro.safeParse(arquivo?.json).success).toBe(true);
  });
});

const lancamentoValido = { tipo: 'saida', data: '2026-10-05', descricao: 'Aluguel', valorCentavos: 80_000 };
const configValida = { mensalidadeCentavos: 7_500, saldoInicialCentavos: 35_000, dataSaldoInicial: '2026-02-05' };

describe('lançamento (corpo)', () => {
  it.each([
    ['', false],
    ['   ', false],
    ['a', true],
    ['x'.repeat(80), true],
    ['x'.repeat(81), false],
  ])('descrição %j → %s', (descricao, aceito) => {
    expect(lancamentoCorpo.safeParse({ ...lancamentoValido, descricao }).success).toBe(aceito);
  });

  it.each([
    [0, false],
    [1, true],
    [99_999_999, true],
    [100_000_000, false],
    [1.5, false],
    ['7500', false],
  ])('valor %j → %s', (valorCentavos, aceito) => {
    expect(lancamentoCorpo.safeParse({ ...lancamentoValido, valorCentavos }).success).toBe(aceito);
  });

  it('tipo desconhecido, data impossível e campo extra são recusados', () => {
    expect(lancamentoCorpo.safeParse({ ...lancamentoValido, tipo: 'transferencia' }).success).toBe(false);
    expect(lancamentoCorpo.safeParse({ ...lancamentoValido, data: '2026-02-30' }).success).toBe(false);
    expect(lancamentoCorpo.safeParse({ ...lancamentoValido, grupoId: 'x' }).success).toBe(false);
    expect(lancamentoCorpo.safeParse({ ...lancamentoValido, mensalidade: true }).success).toBe(false);
  });

  it('a descrição é aparada', () => {
    expect(lancamentoCorpo.parse({ ...lancamentoValido, descricao: '  Aluguel  ' }).descricao).toBe('Aluguel');
  });
});

describe('configuração do caixa (corpo)', () => {
  it('mensalidade nula é aceita e zero não', () => {
    expect(configFinanceiraCorpo.safeParse({ ...configValida, mensalidadeCentavos: null }).success).toBe(true);
    expect(configFinanceiraCorpo.safeParse({ ...configValida, mensalidadeCentavos: 0 }).success).toBe(false);
  });

  it.each([
    [-99_999_999, true],
    [-100_000_000, false],
    [99_999_999, true],
    [100_000_000, false],
    [0, true],
  ])('saldo inicial %i → %s', (saldoInicialCentavos, aceito) => {
    expect(configFinanceiraCorpo.safeParse({ ...configValida, saldoInicialCentavos }).success).toBe(aceito);
  });

  it('campo extra e data malformada são recusados', () => {
    expect(configFinanceiraCorpo.safeParse({ ...configValida, grupoId: 'x' }).success).toBe(false);
    expect(configFinanceiraCorpo.safeParse({ ...configValida, dataSaldoInicial: '05/02/2026' }).success).toBe(false);
  });
});

describe('pagamento', () => {
  const uuid = '00000000-0000-4000-8000-000000000001';
  it('corpo e parâmetros pedem uuid e mês válido', () => {
    expect(marcarPagamentoCorpo.safeParse({ jogadorId: uuid, mes: '2026-10' }).success).toBe(true);
    expect(marcarPagamentoCorpo.safeParse({ jogadorId: 'j-1', mes: '2026-10' }).success).toBe(false);
    expect(marcarPagamentoCorpo.safeParse({ jogadorId: uuid, mes: '2026-13' }).success).toBe(false);
    expect(pagamentoParametros.safeParse({ jogadorId: uuid, mes: '2026-10' }).success).toBe(true);
    expect(pagamentoParametros.safeParse({ jogadorId: uuid, mes: '2026-10', extra: 1 }).success).toBe(false);
  });
});

describe('mês do financeiro: coerência', () => {
  const [cheio] = respostas(/^financeiro-2026-10\.json$/);
  const base = cheio?.json as Record<string, unknown>;

  it('sem configuração, saldo e resumo precisam ser nulos', () => {
    expect(mesFinanceiro.safeParse({ ...base, config: null }).success).toBe(false);
    expect(mesFinanceiro.safeParse({ ...base, saldoAtualCentavos: null }).success).toBe(false);
  });

  it('saldo negativo é aceito e campo extra não', () => {
    expect(mesFinanceiro.safeParse({ ...base, saldoAtualCentavos: -5_000 }).success).toBe(true);
    expect(mesFinanceiro.safeParse({ ...base, financeiro: {} }).success).toBe(false);
  });
});
