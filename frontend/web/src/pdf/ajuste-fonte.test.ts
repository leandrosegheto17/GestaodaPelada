import { describe, expect, it } from 'vitest';
import { escolherTamanho } from './ajuste-fonte';

const ALTURA = 600;

describe('escolherTamanho', () => {
  it('20 linhas cabem no teto (8,5 pt)', () => {
    expect(escolherTamanho({ linhas: 20, alturaDisponivel: ALTURA, teto: 8.5 })).toMatchObject({
      tamanhoFonte: 8.5,
      paginas: 1,
    });
  });

  it('mais linhas reduzem a fonte em passos de 0,5 e ainda cabem numa página', () => {
    const r = escolherTamanho({ linhas: 45, alturaDisponivel: ALTURA, teto: 8.5 });
    expect(r.paginas).toBe(1);
    expect(r.tamanhoFonte).toBeLessThan(8.5);
    expect(r.tamanhoFonte).toBeGreaterThanOrEqual(7);
    expect(r.tamanhoFonte * 2 - Math.floor(r.tamanhoFonte * 2)).toBe(0);
    expect(45 * r.alturaLinha).toBeLessThanOrEqual(ALTURA);
  });

  it('40 linhas ainda cabem com fonte de pelo menos 7 pt', () => {
    const r = escolherTamanho({ linhas: 40, alturaDisponivel: 520, teto: 8.5 });
    expect(r.paginas).toBe(1);
    expect(r.tamanhoFonte).toBeGreaterThanOrEqual(7);
    expect(40 * r.alturaLinha).toBeLessThanOrEqual(520);
  });

  it('muitas linhas ficam no piso e passam para outra página', () => {
    const r = escolherTamanho({ linhas: 100, alturaDisponivel: ALTURA, teto: 8.5 });
    expect(r.tamanhoFonte).toBe(7);
    expect(r.paginas).toBeGreaterThan(1);
    expect(r.linhasPorPagina * r.alturaLinha).toBeLessThanOrEqual(ALTURA);
    expect(r.paginas * r.linhasPorPagina).toBeGreaterThanOrEqual(100);
  });

  it('sem linhas: teto, uma página', () => {
    expect(escolherTamanho({ linhas: 0, alturaDisponivel: ALTURA, teto: 8.5 })).toMatchObject({
      tamanhoFonte: 8.5,
      paginas: 1,
    });
  });
});
