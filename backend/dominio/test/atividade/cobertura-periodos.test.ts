import { describe, expect, it } from 'vitest';
import { coberturaRetirada, type Periodo } from '../../src/index.js';

const p = (inicio: string, fim: string | null): Periodo => ({ inicio, fim });

describe('coberturaRetirada', () => {
  it('antecipar retorno não retira nada', () => {
    const r = coberturaRetirada({
      antes: [p('2026-10-20', null)],
      depois: [p('2026-10-12', null)],
      datasComPresenca: ['2026-10-20', '2026-10-25'],
    });
    expect(r).toEqual({ retiradas: [], limiteSaida: null, limiteRetorno: null });
  });

  it('adiar retorno retira a presença; limite de retorno é a data', () => {
    const r = coberturaRetirada({
      antes: [p('2026-10-12', null)],
      depois: [p('2026-10-20', null)],
      datasComPresenca: ['2026-10-13'],
    });
    expect(r.retiradas).toEqual(['2026-10-13']);
    expect(r.limiteRetorno).toBe('2026-10-13');
  });

  it('antecipar saída: limite de saída é o dia seguinte à mais tarde', () => {
    const r = coberturaRetirada({
      antes: [p('2026-09-01', '2026-10-05')],
      depois: [p('2026-09-01', '2026-10-01')],
      datasComPresenca: ['2026-10-03', '2026-10-02'],
    });
    expect(r.retiradas).toEqual(['2026-10-02', '2026-10-03']);
    expect(r.limiteSaida).toBe('2026-10-04');
    expect(r.limiteRetorno).toBe('2026-10-02');
  });

  it('adiar saída não retira nada', () => {
    const r = coberturaRetirada({
      antes: [p('2026-09-01', '2026-10-01')],
      depois: [p('2026-09-01', '2026-10-05')],
      datasComPresenca: ['2026-10-02'],
    });
    expect(r.retiradas).toEqual([]);
  });

  it('período intermediário entre três', () => {
    const r = coberturaRetirada({
      antes: [p('2026-01-01', '2026-02-01'), p('2026-03-01', '2026-04-01'), p('2026-05-01', null)],
      depois: [p('2026-01-01', '2026-02-01'), p('2026-03-01', '2026-03-10'), p('2026-05-01', null)],
      datasComPresenca: ['2026-01-10', '2026-03-05', '2026-03-20', '2026-05-02'],
    });
    expect(r.retiradas).toEqual(['2026-03-20']);
    expect(r.limiteSaida).toBe('2026-03-21');
  });

  it('sem mudança e sem presenças', () => {
    const per = [p('2026-01-01', null)];
    expect(coberturaRetirada({ antes: per, depois: per, datasComPresenca: ['2026-02-01'] }).retiradas).toEqual([]);
    expect(coberturaRetirada({ antes: per, depois: [], datasComPresenca: [] })).toEqual({
      retiradas: [],
      limiteSaida: null,
      limiteRetorno: null,
    });
  });

  it('bordas: início inclusivo, fim exclusivo', () => {
    const r = coberturaRetirada({
      antes: [p('2026-10-01', '2026-10-20')],
      depois: [p('2026-10-10', '2026-10-15')],
      datasComPresenca: ['2026-10-10', '2026-10-15'],
    });
    expect(r.retiradas).toEqual(['2026-10-15']);
  });

  it('presença que já estava fora antes não bloqueia', () => {
    const r = coberturaRetirada({
      antes: [p('2026-10-10', null)],
      depois: [p('2026-10-12', null)],
      datasComPresenca: ['2026-09-01'],
    });
    expect(r.retiradas).toEqual([]);
    expect(r.limiteRetorno).toBeNull();
  });

  it('duplicadas aparecem uma vez e a entrada congelada não é alterada', () => {
    const antes = Object.freeze([Object.freeze(p('2026-10-01', null))]);
    const depois = Object.freeze([Object.freeze(p('2026-10-10', null))]);
    const datas = Object.freeze(['2026-10-05', '2026-10-03', '2026-10-05']);
    const r = coberturaRetirada({ antes, depois, datasComPresenca: datas });
    expect(r.retiradas).toEqual(['2026-10-03', '2026-10-05']);
    expect(datas).toEqual(['2026-10-05', '2026-10-03', '2026-10-05']);
  });
});
