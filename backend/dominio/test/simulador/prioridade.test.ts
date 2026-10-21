import { describe, expect, it } from 'vitest';
import { calcularRanking, ordenarPrioridade, type EntradaPrioridade } from '../../src/index.js';
import { CONFIGS, jogador, partida, presenca } from '../apoio/historico.js';

function entrada(sobre: Partial<EntradaPrioridade> = {}): EntradaPrioridade {
  return {
    dataPartida: '2026-10-22',
    aptos: ['a', 'b', 'c'],
    jogadores: [jogador('a', 'Ana', 1990), jogador('b', 'Bia', 1991), jogador('c', 'Cris', 1992)],
    partidas: [],
    presencas: [],
    configsPesos: CONFIGS,
    ...sobre,
  };
}

describe('ordenarPrioridade com pontuação inicial', () => {
  it('sem partidas, a pontuação inicial ordena antes do desempate', () => {
    const jogadores = [jogador('a', 'Ana', 1980), jogador('b', 'Bia', 1991, undefined, 30), jogador('c', 'Cris', 1992)];
    expect(ordenarPrioridade(entrada({ jogadores }))).toEqual(['b', 'a', 'c']);
  });

  it('soma a inicial às partidas anteriores à véspera', () => {
    const jogadores = [jogador('a', 'Ana', 1990), jogador('b', 'Bia', 1991, undefined, 1), jogador('c', 'Cris', 1992)];
    const partidas = [partida('2026-10-08'), partida('2026-10-15')];
    const presencas = [presenca('a', '2026-10-08'), presenca('a', '2026-10-15')];
    expect(ordenarPrioridade(entrada({ jogadores, partidas, presencas }))).toEqual(['a', 'b', 'c']);
  });
});

describe('ordenarPrioridade', () => {
  it('sem partidas, a ordem sai do desempate: ano asc e apelido sem acento nem caixa', () => {
    const jogadores = [
      jogador('1', 'Léo', 1990),
      jogador('2', 'leo', 1990),
      jogador('3', 'Leandro', 1990),
      jogador('4', 'Zé', 1985),
    ];
    expect(ordenarPrioridade(entrada({ aptos: ['1', '2', '3', '4'], jogadores }))).toEqual(['4', '3', '1', '2']);
  });

  it('só conta partida anterior: a da própria data e as posteriores não contam', () => {
    const partidas = [partida('2026-10-08'), partida('2026-10-22'), partida('2026-10-29')];
    const presencas = [
      presenca('c', '2026-10-08'),
      ...['a', 'b'].flatMap((id) => [presenca(id, '2026-10-22'), presenca(id, '2026-10-29')]),
    ];
    expect(ordenarPrioridade(entrada({ partidas, presencas }))).toEqual(['c', 'a', 'b']);
    expect(ordenarPrioridade(entrada({ partidas, presencas, dataPartida: '2026-10-23' }))).toEqual(['a', 'b', 'c']);
  });

  it.each([
    ['2026-11-01', '2026-10-31'],
    ['2027-01-01', '2026-12-31'],
  ])('virada de mês e ano: %s usa até %s', (dataPartida, ultimo) => {
    const partidas = [partida('2026-10-01'), partida(ultimo)];
    const presencas = [presenca('a', '2026-10-01'), presenca('c', ultimo)];
    const ordem = ordenarPrioridade(entrada({ dataPartida, partidas, presencas }));
    expect(ordem.slice().sort()).toEqual(['a', 'b', 'c']);
    const antes = ordenarPrioridade(entrada({ dataPartida: ultimo, partidas, presencas }));
    expect(antes[0]).toBe('a');
  });

  it('empate total cai na ordem de id, qualquer que seja a ordem dos aptos', () => {
    const jogadores = [jogador('y', 'Ana', 1990), jogador('x', 'Ana', 1990)];
    expect(ordenarPrioridade(entrada({ aptos: ['y', 'x'], jogadores }))).toEqual(['x', 'y']);
    expect(ordenarPrioridade(entrada({ aptos: ['x', 'y'], jogadores }))).toEqual(['x', 'y']);
  });

  it('só os aptos aparecem e quem não é apto não interfere; apto sem cadastro é erro', () => {
    const partidas = [partida('2026-10-08')];
    const presencas = [presenca('c', '2026-10-08')];
    expect(ordenarPrioridade(entrada({ aptos: ['a', 'b'], partidas, presencas }))).toEqual(['a', 'b']);
    expect(() => ordenarPrioridade(entrada({ aptos: ['a', 'zz'] }))).toThrow();
  });

  it('é a ordem do ranking de hoje restrita aos aptos, quando não há partida na data', () => {
    const partidas = [partida('2026-10-01'), partida('2026-10-08', true)];
    const presencas = [presenca('b', '2026-10-01'), presenca('b', '2026-10-08'), presenca('c', '2026-10-08')];
    const base = entrada({ partidas, presencas });
    const ranking = calcularRanking({
      hoje: '2026-10-21',
      mes: '2026-10',
      jogadores: base.jogadores.map((j) => ({ ...j, periodos: [{ inicio: '2026-01-01', fim: null }] })),
      partidas,
      presencas,
      configsPesos: CONFIGS,
    });
    const esperado = ranking.linhas.map((l) => l.jogadorId).filter((id) => id !== 'a');
    expect(ordenarPrioridade({ ...base, aptos: ['b', 'c'], dataPartida: '2026-10-22' })).toEqual(esperado);
  });
});

describe('ordenarPrioridade com data de início', () => {
  const partidas = [partida('2026-10-08'), partida('2026-10-15')];
  const presencas = [presenca('a', '2026-10-08'), presenca('a', '2026-10-15'), presenca('b', '2026-10-15')];
  const com = (inicioPontuacao: string) => [
    { ...jogador('a', 'Ana', 1990), inicioPontuacao },
    jogador('b', 'Bia', 1991),
    jogador('c', 'Cris', 1992),
  ];

  it('início na data da partida anterior mantém as presenças', () => {
    expect(ordenarPrioridade(entrada({ jogadores: com('2026-10-08'), partidas, presencas }))).toEqual(['a', 'b', 'c']);
  });

  it('início depois das presenças zera quem avançou e o põe atrás no desempate', () => {
    expect(ordenarPrioridade(entrada({ jogadores: com('2026-10-22'), partidas, presencas }))).toEqual(['b', 'a', 'c']);
  });
});
