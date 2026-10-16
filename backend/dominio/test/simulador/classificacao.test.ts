import { describe, expect, it } from 'vitest';
import { classificarDoisTimes, saidaNoIntervalo, vagasDeReserva, type AptoOrdenado } from '../../src/index.js';

const lista = (quantos: number, so1o: readonly number[] = []): AptoOrdenado[] =>
  Array.from({ length: quantos }, (_, i) => ({ id: `j${i + 1}`, so1oTempo: so1o.includes(i + 1) }));
const ids = (itens: readonly { id: string }[]) => itens.map((i) => i.id);

describe('vagasDeReserva', () => {
  it.each([
    [7, 2, 4],
    [7, 0, 0],
    [7, 10, 14],
    [7, 'ilimitado' as const, 14],
  ])('N=%i K=%s → %i', (n, k, vagas) => {
    expect(vagasDeReserva(n, k)).toBe(vagas);
  });
});

describe('classificarDoisTimes', () => {
  it('19 aptos, N=7, K=2: 14 titulares, 4 reservas entram e 1 não entra', () => {
    const r = classificarDoisTimes({ ordem: lista(19), n: 7, k: 2 });
    expect(r.titulares).toHaveLength(14);
    expect(ids(r.reservasQueEntram)).toEqual(['j15', 'j16', 'j17', 'j18']);
    expect(ids(r.naoEntra)).toEqual(['j19']);
  });

  it('K = 0: nenhum reserva entra e todos vão para "não entra"', () => {
    const r = classificarDoisTimes({ ordem: lista(17), n: 7, k: 0 });
    expect(r.reservasQueEntram).toEqual([]);
    expect(ids(r.naoEntra)).toEqual(['j15', 'j16', 'j17']);
  });

  it.each([
    [30, 7, 14, 2],
    [20, 7, 6, 0],
  ])('ilimitado: %i aptos, N=%i → %i entram, %i não entram', (aptos, n, entram, fora) => {
    const r = classificarDoisTimes({ ordem: lista(aptos), n, k: 'ilimitado' });
    expect(r.reservasQueEntram).toHaveLength(entram);
    expect(r.naoEntra).toHaveLength(fora);
  });

  it('K maior que N vale N (igual ao ilimitado)', () => {
    const ordem = lista(30);
    expect(classificarDoisTimes({ ordem, n: 7, k: 10 })).toEqual(classificarDoisTimes({ ordem, n: 7, k: 'ilimitado' }));
  });

  it('todos "só 1º tempo": reservas que entram jogam só o 2º e o excedente não entra', () => {
    const ordem = lista(
      18,
      Array.from({ length: 18 }, (_, i) => i + 1),
    );
    const r = classificarDoisTimes({ ordem, n: 7, k: 1 });
    expect(r.reservasQueEntram.map((x) => x.jogaSo2oTempo)).toEqual([true, true]);
    expect(ids(r.naoEntra)).toEqual(['j17', 'j18']);
    expect(r.titulares.every((t) => t.so1oTempo)).toBe(true);
  });

  it('exatamente 2N aptos não tem reserva; 2N − 1 lança RangeError', () => {
    const r = classificarDoisTimes({ ordem: lista(14), n: 7, k: 'ilimitado' });
    expect(r.reservasQueEntram).toEqual([]);
    expect(r.naoEntra).toEqual([]);
    expect(() => classificarDoisTimes({ ordem: lista(13), n: 7, k: 2 })).toThrow(RangeError);
  });

  it('titulares + reservas + não entra = ordem, sem repetição e na ordem original', () => {
    const ordem = lista(25, [3, 16]);
    const r = classificarDoisTimes({ ordem, n: 7, k: 2 });
    expect([...ids(r.titulares), ...ids(r.reservasQueEntram), ...ids(r.naoEntra)]).toEqual(ids(ordem));
  });
});

describe('saidaNoIntervalo', () => {
  it('sem reservas e sem "só 1º tempo", ninguém sai', () => {
    expect(saidaNoIntervalo(lista(7), 0)).toEqual([]);
  });

  it('3 "só 1º tempo" com 1 reserva: saem os 3', () => {
    expect(saidaNoIntervalo(lista(7, [2, 4, 6]), 1)).toEqual(['j2', 'j4', 'j6']);
  });

  it('1 "só 1º tempo" com 3 reservas: ele e os 2 piores', () => {
    expect(saidaNoIntervalo(lista(7, [2]), 3)).toEqual(['j2', 'j7', 'j6']);
  });

  it('2 reservas sem "só 1º tempo": saem o pior e o penúltimo', () => {
    expect(saidaNoIntervalo(lista(7), 2)).toEqual(['j7', 'j6']);
  });

  it('reservas = N: todos saem', () => {
    expect(saidaNoIntervalo(lista(7), 7)).toHaveLength(7);
  });

  it('titular "só 1º tempo" sai mesmo sem reserva (K = 0)', () => {
    expect(saidaNoIntervalo(lista(7, [5]), 0)).toEqual(['j5']);
  });
});
