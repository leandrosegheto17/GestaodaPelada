import { describe, expect, it } from 'vitest';
import { descreverPeriodos, type PeriodoComId } from '../../src/index.js';

const p = (id: string, inicio: string, fim: string | null): PeriodoComId => ({ id, inicio, fim });

describe('descreverPeriodos', () => {
  it('um período aberto: nada corrigível, tipo entrada', () => {
    const [r] = descreverPeriodos([p('a', '2026-01-01', null)]);
    expect(r).toEqual({
      id: 'a',
      tipo: 'entrada',
      inicio: '2026-01-01',
      fim: null,
      corrigivel: { saida: false, retorno: false },
      saidaAnterior: null,
      inicioDoProximo: null,
    });
  });

  it('um período encerrado: só saída', () => {
    const [r] = descreverPeriodos([p('a', '2026-01-01', '2026-02-01')]);
    expect(r?.corrigivel).toEqual({ saida: true, retorno: false });
    expect(r?.tipo).toBe('entrada');
  });

  it('1º encerrado e 2º aberto: 1º só saída, 2º só retorno', () => {
    const r = descreverPeriodos([p('a', '2026-01-01', '2026-02-01'), p('b', '2026-03-01', null)]);
    expect(r[0]?.corrigivel).toEqual({ saida: true, retorno: false });
    expect(r[1]?.tipo).toBe('retorno');
    expect(r[1]?.corrigivel).toEqual({ saida: false, retorno: true });
  });

  it('três períodos: o do meio corrige os dois e os vizinhos são informados', () => {
    const r = descreverPeriodos([
      p('a', '2026-01-01', '2026-02-01'),
      p('b', '2026-03-01', '2026-04-01'),
      p('c', '2026-05-01', null),
    ]);
    expect(r[1]?.corrigivel).toEqual({ saida: true, retorno: true });
    expect(r.map((x) => x.saidaAnterior)).toEqual([null, '2026-02-01', '2026-04-01']);
    expect(r.map((x) => x.inicioDoProximo)).toEqual(['2026-03-01', '2026-05-01', null]);
  });

  it('entrada fora de ordem sai em ordem cronológica, com ids preservados', () => {
    const r = descreverPeriodos([
      p('c', '2026-05-01', null),
      p('a', '2026-01-01', '2026-02-01'),
      p('b', '2026-03-01', '2026-04-01'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(r.map((x) => x.tipo)).toEqual(['entrada', 'retorno', 'retorno']);
  });

  it('saída igual ao retorno seguinte é preservada', () => {
    const r = descreverPeriodos([p('a', '2026-01-01', '2026-02-01'), p('b', '2026-02-01', null)]);
    expect(r[0]?.inicioDoProximo).toBe('2026-02-01');
    expect(r[1]?.saidaAnterior).toBe('2026-02-01');
  });

  it('lista vazia devolve []', () => {
    expect(descreverPeriodos([])).toEqual([]);
  });

  it('não altera a entrada congelada', () => {
    const entrada = Object.freeze([
      Object.freeze(p('b', '2026-03-01', null)),
      Object.freeze(p('a', '2026-01-01', '2026-02-01')),
    ]);
    expect(() => descreverPeriodos(entrada)).not.toThrow();
    expect(entrada.map((x) => x.id)).toEqual(['b', 'a']);
  });
});
