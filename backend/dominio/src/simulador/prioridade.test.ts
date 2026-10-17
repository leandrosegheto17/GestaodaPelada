import { describe, expect, it } from 'vitest';
import { calcularRanking, ordenarPrioridade } from '../index.js';
import { CONFIGS, historicoDeTresMeses, jogador, partida, presenca } from '../../test/apoio/historico.js';

const base = { configsPesos: CONFIGS };

describe('ordenarPrioridade', () => {
  const jogadores = [jogador('a', 'Ana', 1990), jogador('b', 'Bia', 1991)];

  it('ignora partida na própria data e posteriores; um dia depois ela passa a contar', () => {
    const partidas = [partida('2026-10-10'), partida('2026-10-17')];
    const presencas = [presenca('b', '2026-10-10'), presenca('a', '2026-10-17'), presenca('a', '2026-10-24')];
    const entrada = { ...base, jogadores, partidas, presencas, aptos: ['a', 'b'] };
    expect(ordenarPrioridade({ ...entrada, dataPartida: '2026-10-17' })).toEqual(['b', 'a']);
    expect(ordenarPrioridade({ ...entrada, dataPartida: '2026-10-18' })).toEqual(['a', 'b']);
  });

  it('usa a véspera na virada de mês e de ano', () => {
    const partidas = [partida('2026-10-31'), partida('2026-11-01'), partida('2026-12-31'), partida('2027-01-01')];
    const entrada = (j: string, d: string) => ({
      ...base,
      jogadores,
      partidas,
      aptos: ['a', 'b'],
      presencas: [presenca(j, d)],
    });
    expect(ordenarPrioridade({ ...entrada('b', '2026-10-31'), dataPartida: '2026-11-01' })).toEqual(['b', 'a']);
    expect(ordenarPrioridade({ ...entrada('b', '2026-11-01'), dataPartida: '2026-11-01' })).toEqual(['a', 'b']);
    expect(ordenarPrioridade({ ...entrada('b', '2026-12-31'), dataPartida: '2027-01-01' })).toEqual(['b', 'a']);
    expect(ordenarPrioridade({ ...entrada('b', '2027-01-01'), dataPartida: '2027-01-01' })).toEqual(['a', 'b']);
  });

  it('sem partidas ordena por ano de nascimento e apelido sem acento nem caixa', () => {
    const js = [
      jogador('1', 'Leandro', 1990),
      jogador('2', 'leo', 1990),
      jogador('3', 'Léo', 1985),
      jogador('4', 'Zé', 1980),
    ];
    const saida = ordenarPrioridade({
      ...base,
      jogadores: js,
      partidas: [],
      presencas: [],
      aptos: ['1', '2', '3', '4'],
      dataPartida: '2026-10-17',
    });
    expect(saida).toEqual(['4', '3', '1', '2']);
  });

  it('empate total cai na ordem de id, qualquer que seja a ordem dos aptos', () => {
    const js = [jogador('y', 'Léo', 1990), jogador('x', 'Leo', 1990), jogador('z', 'LEO', 1990)];
    const e = { ...base, jogadores: js, partidas: [], presencas: [], dataPartida: '2026-10-17' };
    const a = ordenarPrioridade({ ...e, aptos: ['y', 'x', 'z'] });
    expect(a).toEqual(['x', 'y', 'z']);
    expect(ordenarPrioridade({ ...e, aptos: ['z', 'x', 'y'] })).toEqual(a);
  });

  it('só os aptos entram; apto sem cadastro lança', () => {
    const partidas = [partida('2026-10-01')];
    const presencas = [presenca('a', '2026-10-01')];
    const e = { ...base, jogadores, partidas, presencas, dataPartida: '2026-10-17' };
    expect(ordenarPrioridade({ ...e, aptos: ['b'] })).toEqual(['b']);
    expect(() => ordenarPrioridade({ ...e, aptos: ['b', 'zzz'] })).toThrow();
  });

  it('coincide com o ranking de hoje restrito aos aptos quando não há partida no dia seguinte', () => {
    const h = historicoDeTresMeses();
    const hoje = '2026-10-17';
    const ranking = calcularRanking({ ...h, hoje, mes: '2026-10' });
    const aptos = ['a', 'b', 'c', 'e'];
    const esperado = ranking.linhas.map((l) => l.jogadorId).filter((id) => aptos.includes(id));
    expect(ordenarPrioridade({ ...h, aptos, dataPartida: '2026-10-18' })).toEqual(esperado);
  });
});
