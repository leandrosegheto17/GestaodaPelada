import { describe, expect, it } from 'vitest';
import { ordenarAtivosNaData, ordenarAtivosNoMes } from '../../../src/aplicacao/elenco/ativos.js';

const jogador = (id: string, apelido: string, periodos: { inicio: string; fim: string | null }[]) => ({
  id,
  apelido,
  periodos,
});

const entrouNoMeio = jogador('1', 'Zé', [{ inicio: '2026-10-15', fim: null }]);
const saiuNoMeio = jogador('2', 'ana', [{ inicio: '2026-01-01', fim: '2026-10-20' }]);
const parouEVoltou = jogador('3', 'Beto', [
  { inicio: '2026-01-01', fim: '2026-09-30' },
  { inicio: '2026-11-05', fim: null },
]);

describe('jogadores ativos', () => {
  it('na data: entrada dentro no próprio dia, saída fora no dia', () => {
    const ids = (data: string) => ordenarAtivosNaData([entrouNoMeio, saiuNoMeio, parouEVoltou], data).map((j) => j.id);
    expect(ids('2026-10-14')).toEqual(['2']);
    expect(ids('2026-10-15')).toEqual(['2', '1']);
    expect(ids('2026-10-19')).toEqual(['2', '1']);
    expect(ids('2026-10-20')).toEqual(['1']);
  });

  it('no mês: quem entra ou sai no meio aparece; quem ficou inativo o mês inteiro não', () => {
    const lista = [entrouNoMeio, saiuNoMeio, parouEVoltou];
    expect(ordenarAtivosNoMes(lista, '2026-10').map((j) => j.id)).toEqual(['2', '1']);
    expect(ordenarAtivosNoMes(lista, '2026-09').map((j) => j.id)).toEqual(['2', '3']);
    expect(ordenarAtivosNoMes(lista, '2026-11').map((j) => j.id)).toEqual(['3', '1']);
  });

  it('não altera a lista original', () => {
    const original = [entrouNoMeio, saiuNoMeio];
    ordenarAtivosNaData(original, '2026-10-16');
    expect(original.map((j) => j.id)).toEqual(['1', '2']);
  });
});
