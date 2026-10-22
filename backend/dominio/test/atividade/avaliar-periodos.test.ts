import { describe, expect, it } from 'vitest';
import { avaliarPeriodos, type EntradaAvaliacao, type Operacao, type PeriodoComId } from '../../src/index.js';

const p = (id: string, inicio: string, fim: string | null): PeriodoComId => ({ id, inicio, fim });

const dois = (): PeriodoComId[] => [p('p1', '2026-01-01', '2026-10-05'), p('p2', '2026-10-20', null)];

function avaliar(operacao: Operacao, extra: Partial<EntradaAvaliacao> = {}) {
  return avaliarPeriodos({
    periodos: dois(),
    operacao,
    hoje: '2026-10-21',
    inicioPontuacao: '2026-01-01',
    datasComPresenca: [],
    ...extra,
  });
}

const recusa = (regra: string, campo: string, limite: string | null, presenca?: string) =>
  presenca === undefined ? { ok: false, regra, campo, limite } : { ok: false, regra, campo, limite, presenca };

describe('avaliarPeriodos: corrigir', () => {
  it('(a) data futura, limite hoje', () => {
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: '2026-10-22' })).toEqual(
      recusa('a', 'saida', '2026-10-21'),
    );
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p2', retorno: '2026-11-01' })).toEqual(
      recusa('a', 'retorno', '2026-10-21'),
    );
  });

  it('(b) saída antes do início do próprio período; igual ao início é aceita', () => {
    const antes = avaliarPeriodos({
      periodos: [p('p1', '2026-01-10', '2026-02-01'), p('p2', '2026-03-01', null)],
      operacao: { tipo: 'corrigir', periodoId: 'p1', saida: '2026-01-09' },
      hoje: '2026-10-21',
      inicioPontuacao: '2026-01-01',
      datasComPresenca: [],
    });
    expect(antes).toEqual(recusa('b', 'saida', '2026-01-10'));
    const igual = avaliarPeriodos({
      periodos: [p('p1', '2026-01-10', '2026-02-01'), p('p2', '2026-03-01', null)],
      operacao: { tipo: 'corrigir', periodoId: 'p1', saida: '2026-01-10' },
      hoje: '2026-10-21',
      inicioPontuacao: '2026-01-01',
      datasComPresenca: [],
    });
    expect(igual).toMatchObject({ ok: true, alterado: true });
  });

  it('(c) retorno antes da saída anterior; igual a ela é aceito', () => {
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p2', retorno: '2026-10-04' })).toEqual(
      recusa('c', 'retorno', '2026-10-05'),
    );
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p2', retorno: '2026-10-05' })).toMatchObject({
      ok: true,
      alterado: true,
    });
  });

  it('(d) saída depois do retorno do próximo, limite = o retorno', () => {
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: '2026-10-21' })).toEqual(
      recusa('d', 'saida', '2026-10-20'),
    );
  });

  it('(d) retorno depois da saída do próprio período, limite = essa saída', () => {
    const periodos = [
      p('p1', '2026-01-01', '2026-03-01'),
      p('p2', '2026-04-01', '2026-06-01'),
      p('p3', '2026-07-01', null),
    ];
    const r = avaliar({ tipo: 'corrigir', periodoId: 'p2', retorno: '2026-06-02' }, { periodos });
    expect(r).toEqual(recusa('d', 'retorno', '2026-06-01'));
  });

  it('(f) saída do 1º antes da última presença: limite é o dia seguinte e traz a presença', () => {
    const r = avaliar(
      { tipo: 'corrigir', periodoId: 'p1', saida: '2026-09-01' },
      { datasComPresenca: ['2026-08-15', '2026-09-10', '2026-12-01'] },
    );
    expect(r).toEqual(recusa('f', 'saida', '2026-09-11', '2026-09-10'));
  });

  it('(f) retorno depois de uma presença: limite é a presença mais cedo retirada', () => {
    const periodos = [p('p1', '2026-01-01', '2026-03-01'), p('p2', '2026-04-01', null)];
    const r = avaliar(
      { tipo: 'corrigir', periodoId: 'p2', retorno: '2026-05-01' },
      { periodos, datasComPresenca: ['2026-04-10', '2026-04-20'] },
    );
    expect(r).toEqual(recusa('f', 'retorno', '2026-04-10', '2026-04-10'));
  });

  it('(f) presença que já estava fora antes da correção não bloqueia', () => {
    const r = avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: '2026-09-01' }, { datasComPresenca: ['2026-10-10'] });
    expect(r).toMatchObject({ ok: true, alterado: true });
  });

  it('(g) saída do 1º período antes do início da pontuação', () => {
    const periodos = [p('p1', '2026-01-01', '2026-10-05'), p('p2', '2026-10-20', null)];
    const r = avaliar(
      { tipo: 'corrigir', periodoId: 'p1', saida: '2026-02-01' },
      { periodos, inicioPontuacao: '2026-03-01' },
    );
    expect(r).toEqual(recusa('g', 'saida', '2026-03-01'));
  });

  it('(h) data inexistente e formatos errados', () => {
    for (const ruim of [
      '2026-02-30',
      '2026-13-01',
      '0000-00-00',
      '',
      ' 2026-01-02',
      '2026-01-02T00:00',
      '2026-1-2',
      '99999-01-01',
    ]) {
      expect(avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: ruim })).toEqual(recusa('h', 'saida', null));
    }
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: null as never })).toEqual(recusa('h', 'saida', null));
  });

  it('(h) vem antes de (a) e (a) antes de (b)', () => {
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: '2026-02-30', retorno: '2027-01-01' })).toMatchObject({
      regra: 'h',
      campo: 'saida',
    });
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p2', retorno: '2027-01-01' })).toMatchObject({ regra: 'a' });
    // futura e também após a saída do próprio período: (a) vence (d)
    const periodos = [p('p1', '2026-01-01', '2026-03-01'), p('p2', '2026-04-01', '2026-06-01')];
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p2', retorno: '2027-01-01' }, { periodos })).toMatchObject({
      regra: 'a',
    });
  });

  it('(b) vem antes de (f)', () => {
    const r = avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: '2025-12-31' }, { datasComPresenca: ['2026-02-01'] });
    expect(r).toMatchObject({ regra: 'b' });
  });

  it('campo não corrigível é recusa própria', () => {
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p1', retorno: '2026-01-02' })).toEqual(
      recusa('nao-corrigivel', 'retorno', null),
    );
    expect(avaliar({ tipo: 'corrigir', periodoId: 'p2', saida: '2026-10-21' })).toEqual(
      recusa('nao-corrigivel', 'saida', null),
    );
    expect(avaliar({ tipo: 'corrigir', periodoId: 'zzz', saida: '2026-10-01' })).toMatchObject({
      ok: false,
      regra: 'nao-corrigivel',
    });
    expect(avaliar({ tipo: 'corrigir', periodoId: 'zzz' })).toMatchObject({ ok: false, regra: 'nao-corrigivel' });
  });

  it('datas iguais às atuais: ok, sem alterar', () => {
    const r = avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: '2026-10-05' }, { datasComPresenca: ['2026-10-04'] });
    expect(r).toEqual({ ok: true, alterado: false, periodos: dois() });
  });

  it('corrigir válido devolve os períodos resultantes', () => {
    const r = avaliar({ tipo: 'corrigir', periodoId: 'p1', saida: '2026-10-10' });
    expect(r).toEqual({
      ok: true,
      alterado: true,
      periodos: [p('p1', '2026-01-01', '2026-10-10'), p('p2', '2026-10-20', null)],
    });
  });
});

describe('avaliarPeriodos: reativar', () => {
  it('retorno retroativo depois da saída anterior é aceito', () => {
    const periodos = [p('p1', '2026-01-01', '2026-10-05')];
    const r = avaliar({ tipo: 'reativar', dataRetorno: '2026-10-12' }, { periodos });
    expect(r).toMatchObject({ ok: true, alterado: true });
    expect(r.ok && r.periodos.at(-1)).toEqual({ inicio: '2026-10-12', fim: null });
  });

  it('(c) retorno antes da saída anterior', () => {
    const periodos = [p('p1', '2026-01-01', '2026-10-05')];
    expect(avaliar({ tipo: 'reativar', dataRetorno: '2026-10-04' }, { periodos })).toEqual(
      recusa('c', 'dataRetorno', '2026-10-05'),
    );
  });

  it('(a) futura e (h) inválida', () => {
    const periodos = [p('p1', '2026-01-01', '2026-10-05')];
    expect(avaliar({ tipo: 'reativar', dataRetorno: '2026-10-22' }, { periodos })).toEqual(
      recusa('a', 'dataRetorno', '2026-10-21'),
    );
    expect(avaliar({ tipo: 'reativar', dataRetorno: '2026-02-30' }, { periodos })).toEqual(
      recusa('h', 'dataRetorno', null),
    );
  });

  it('(e) já existe período aberto', () => {
    expect(avaliar({ tipo: 'reativar', dataRetorno: '2026-10-21' })).toMatchObject({
      ok: false,
      regra: 'e',
      campo: 'dataRetorno',
    });
  });

  it('não aplica (f): presença não bloqueia', () => {
    const periodos = [p('p1', '2026-01-01', '2026-10-05')];
    const r = avaliar({ tipo: 'reativar', dataRetorno: '2026-10-12' }, { periodos, datasComPresenca: ['2026-10-13'] });
    expect(r.ok).toBe(true);
  });
});

describe('avaliarPeriodos: inativar', () => {
  const aberto = [p('p1', '2026-01-01', null)];

  it('saída válida fecha o período aberto', () => {
    const r = avaliar({ tipo: 'inativar', dataSaida: '2026-10-10' }, { periodos: aberto });
    expect(r).toEqual({ ok: true, alterado: true, periodos: [p('p1', '2026-01-01', '2026-10-10')] });
  });

  it('(f) presença depois da saída, com a presença', () => {
    const r = avaliar(
      { tipo: 'inativar', dataSaida: '2026-10-01' },
      { periodos: aberto, datasComPresenca: ['2026-10-03'] },
    );
    expect(r).toEqual(recusa('f', 'saida', '2026-10-04', '2026-10-03'));
  });

  it('(b) saída antes da entrada, (a) futura, (h) inválida', () => {
    expect(avaliar({ tipo: 'inativar', dataSaida: '2025-12-31' }, { periodos: aberto })).toEqual(
      recusa('b', 'saida', '2026-01-01'),
    );
    expect(avaliar({ tipo: 'inativar', dataSaida: '2026-10-22' }, { periodos: aberto })).toEqual(
      recusa('a', 'saida', '2026-10-21'),
    );
    expect(avaliar({ tipo: 'inativar', dataSaida: '' }, { periodos: aberto })).toEqual(recusa('h', 'saida', null));
  });

  it('(g) 1º período aberto com início da pontuação depois da saída', () => {
    const r = avaliar(
      { tipo: 'inativar', dataSaida: '2026-02-01' },
      { periodos: aberto, inicioPontuacao: '2026-03-01' },
    );
    expect(r).toMatchObject({ ok: false, regra: 'g', limite: '2026-03-01' });
  });

  it('sem período aberto: recusa própria', () => {
    const r = avaliar(
      { tipo: 'inativar', dataSaida: '2026-10-10' },
      { periodos: [p('p1', '2026-01-01', '2026-02-01')] },
    );
    expect(r).toEqual(recusa('nao-corrigivel', 'saida', null));
  });
});

describe('avaliarPeriodos: entrada', () => {
  it('não altera a entrada congelada nem a ordem', () => {
    const periodos = Object.freeze([
      Object.freeze(p('p2', '2026-10-20', null)),
      Object.freeze(p('p1', '2026-01-01', '2026-10-05')),
    ]);
    const copia = JSON.stringify(periodos);
    const r = avaliarPeriodos({
      periodos,
      operacao: { tipo: 'corrigir', periodoId: 'p1', saida: '2026-10-10' },
      hoje: '2026-10-21',
      inicioPontuacao: '2026-01-01',
      datasComPresenca: Object.freeze(['2026-02-01']) as string[],
    });
    expect(r.ok).toBe(true);
    expect(JSON.stringify(periodos)).toBe(copia);
  });
});
