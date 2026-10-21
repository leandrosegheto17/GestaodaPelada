import { describe, expect, it } from 'vitest';
import {
  calcularRanking,
  limitesDeMes,
  mesDentroDosLimites,
  navegacaoDeMes,
  ordenarPorRanking,
} from '../../src/index.js';
import { CONFIGS, historicoDeTresMeses, jogador, partida, presenca } from '../apoio/historico.js';

const HOJE = '2026-10-10';
const base = historicoDeTresMeses();
const ranking = (mes: string, hoje = HOJE) => calcularRanking({ ...base, hoje, mes });

describe('pontuação inicial', () => {
  const entrada = (jogadores: ReturnType<typeof jogador>[], mes = '2026-10') => ({
    hoje: HOJE,
    mes,
    jogadores,
    partidas: [partida('2026-10-01'), partida('2026-10-08')],
    presencas: [presenca('a', '2026-10-01'), presenca('a', '2026-10-08')],
    configsPesos: CONFIGS,
  });

  it('sem partida: ptsInicial e ptsFinal são a pontuação inicial em qualquer mês', () => {
    const solo = [jogador('z', 'Zeca', 1990, undefined, 50)];
    for (const mes of ['2026-08', '2026-10', '2027-01']) {
      const [linha] = calcularRanking({ ...entrada(solo, mes), partidas: [], presencas: [] }).linhas;
      expect([linha!.ptsInicial, linha!.ptsFinal]).toEqual([50, 50]);
    }
  });

  it('com partidas: soma a inicial ao acumulado e ao ptsInicial do mês', () => {
    const [linha] = calcularRanking(entrada([jogador('a', 'Ana', 1990, undefined, 50)])).linhas;
    expect([linha!.ptsInicial, linha!.ptsFinal]).toEqual([50, 52]);
  });

  it('a ordem do RN-05 usa o total com a inicial', () => {
    const r = calcularRanking(
      entrada([jogador('a', 'Ana', 1990), jogador('b', 'Bia', 1991, undefined, 10), jogador('c', 'Cris', 1992)]),
    );
    expect(r.linhas.map((l) => [l.jogadorId, l.posicao])).toEqual([
      ['b', 1],
      ['a', 2],
      ['c', 3],
    ]);
  });

  it('inativar e reativar não muda a inicial (RN-22)', () => {
    const periodos = [
      { inicio: '2026-01-01', fim: '2026-09-05' },
      { inicio: '2026-09-20', fim: null },
    ];
    const [linha] = calcularRanking(entrada([jogador('a', 'Ana', 1990, periodos, 50)])).linhas;
    expect(linha!.ptsFinal).toBe(52);
  });

  it('ptsFinal(M) = ptsInicial(M+1) com inicial diferente de zero', () => {
    const j = [jogador('a', 'Ana', 1990, undefined, 7)];
    const ago = calcularRanking(entrada(j, '2026-09')).linhas[0]!;
    const out = calcularRanking(entrada(j, '2026-10')).linhas[0]!;
    expect(out.ptsInicial).toBe(ago.ptsFinal);
  });
});

describe('calcularRanking com histórico de 3 meses', () => {
  it('lista só os ativos hoje, na ordem do acumulado', () => {
    const r = ranking('2026-10');
    // f foi inativado em 20/09; e voltou em 01/10 (4 pontos); d entrou em 08/10
    expect(r.linhas.map((l) => l.jogadorId)).toEqual(['a', 'b', 'e', 'c', 'd']);
    expect(r.linhas.map((l) => l.posicao)).toEqual([1, 2, 3, 4, 5]);
  });

  it('valores de outubro conferidos à mão', () => {
    const [a, b, e, c, d] = ranking('2026-10').linhas;
    // a: ago 2 + set (1 + 2 com chuva) = 5 antes de outubro; out: 1 + 2 (chuva, pesos novos)
    expect([a!.ptsInicial, a!.ptsFinal]).toEqual([5, 8]);
    expect(a!.rodadas).toEqual([
      { situacao: 'presente', pontos: 1 },
      { situacao: 'presente', pontos: 2 },
    ]);
    // b: ago 2 + set 1 + 2 = 5; out: lesionado 1, falta 0
    expect([b!.ptsInicial, b!.ptsFinal]).toEqual([5, 6]);
    expect(b!.rodadas[1]).toEqual({ situacao: 'falta', pontos: 0 });
    // c: ago 1, set expulso -1 → 0; out 1 + 2
    expect([c!.ptsInicial, c!.ptsFinal]).toEqual([0, 3]);
    // e: inativo de 05/09 a 30/09 e volta em 01/10
    expect(e!.rodadas[0]).toEqual({ situacao: 'presente', pontos: 1 });
    expect(e!.rodadas[1]).toEqual({ situacao: 'falta', pontos: 0 });
    // d: entrou em 08/10 → fora em 01/10
    expect(d!.rodadas[0]).toEqual({ situacao: 'fora', pontos: null });
    expect(d!.rodadas[1]).toEqual({ situacao: 'presente', pontos: 2 });
  });

  it('ptsFinal(M) = ptsInicial(M+1) para os jogadores ativos', () => {
    for (const [m, prox] of [
      ['2026-08', '2026-09'],
      ['2026-09', '2026-10'],
    ] as const) {
      const atual = new Map(ranking(m).linhas.map((l) => [l.jogadorId, l.ptsFinal]));
      for (const l of ranking(prox).linhas) {
        if (atual.has(l.jogadorId)) expect(l.ptsInicial).toBe(atual.get(l.jogadorId));
      }
    }
  });

  it('a ordem não muda ao trocar o mês pedido', () => {
    const ordem = (m: string) => ranking(m).linhas.map((l) => `${l.jogadorId}:${l.posicao}`);
    expect(ordem('2026-08')).toEqual(ordem('2026-10'));
    expect(ordem('2026-09')).toEqual(ordem('2026-10'));
  });

  it('colunas, resumo e navegação', () => {
    const r = ranking('2026-10');
    expect(r.partidas).toEqual([
      { data: '2026-10-01', choveu: false },
      { data: '2026-10-08', choveu: true },
    ]);
    expect(r.resumoMes).toEqual({ partidas: 2, comChuva: 1 });
    expect(r.navegacao).toEqual({ mesAnterior: '2026-09', mesSeguinte: null });
    expect(ranking('2026-08').navegacao).toEqual({ mesAnterior: null, mesSeguinte: '2026-09' });
  });

  it('mês sem partidas dentro dos limites mantém o acumulado', () => {
    const sem = { ...base, partidas: base.partidas.filter((p) => !p.data.startsWith('2026-09')) };
    const r = calcularRanking({ ...sem, hoje: HOJE, mes: '2026-09' });
    expect(r.partidas).toEqual([]);
    for (const l of r.linhas) {
      expect(l.rodadas).toEqual([]);
      expect(l.ptsFinal).toBe(l.ptsInicial);
    }
  });
});

describe('grupo sem partidas', () => {
  it('linhas dos ativos zeradas e navegação nula', () => {
    const r = calcularRanking({
      hoje: HOJE,
      mes: '2026-10',
      jogadores: [jogador('x', 'Xis')],
      partidas: [],
      presencas: [],
      configsPesos: CONFIGS,
    });
    expect(r.linhas).toHaveLength(1);
    expect(r.navegacao).toEqual({ mesAnterior: null, mesSeguinte: null });
    expect(mesDentroDosLimites(r.limites, '2026-10')).toBe(false);
  });
});

describe('ordenarPorRanking', () => {
  it('desempata por ano de nascimento e por apelido sem acento nem caixa', () => {
    const js = [
      { id: '1', apelido: 'leo', anoNascimento: 1990 },
      { id: '2', apelido: 'Leandro', anoNascimento: 1990 },
      { id: '3', apelido: 'Zeca', anoNascimento: 1985 },
      { id: '4', apelido: 'Léo', anoNascimento: 1990 },
    ];
    const r = ordenarPorRanking(js, new Map(js.map((j) => [j.id, 10])));
    expect(r.map((x) => x.jogador.id)).toEqual(['3', '2', '1', '4']);
    // Léo e leo empatam nos três critérios e repetem a posição; o seguinte pula
    expect(r.map((x) => x.posicao)).toEqual([1, 2, 3, 3]);
  });

  it('acumulado maior vem primeiro; o apelido desempata', () => {
    const js = [
      { id: 'a', apelido: 'A', anoNascimento: 1990 },
      { id: 'b', apelido: 'B', anoNascimento: 1990 },
      { id: 'c', apelido: 'C', anoNascimento: 1990 },
    ];
    const r = ordenarPorRanking(
      js,
      new Map([
        ['a', 5],
        ['b', 9],
        ['c', 5],
      ]),
    );
    expect(r.map((x) => x.jogador.id)).toEqual(['b', 'a', 'c']);
    expect(r.map((x) => x.posicao)).toEqual([1, 2, 3]);
  });
});

describe('limites de mês', () => {
  it('dentro, nas pontas e fora', () => {
    const lim = limitesDeMes([partida('2026-08-06'), partida('2026-10-01')], '2026-10-10');
    expect(lim).toEqual({ primeiro: '2026-08', ultimo: '2026-10' });
    expect(mesDentroDosLimites(lim, '2026-08')).toBe(true);
    expect(mesDentroDosLimites(lim, '2026-10')).toBe(true);
    expect(mesDentroDosLimites(lim, '2026-07')).toBe(false);
    expect(mesDentroDosLimites(lim, '2026-11')).toBe(false);
    expect(navegacaoDeMes(lim, '2026-09')).toEqual({
      mesAnterior: '2026-08',
      mesSeguinte: '2026-10',
    });
  });
});

describe('desempenho', () => {
  it('40 jogadores × 104 partidas calculam em menos de 5 ms (mediana)', () => {
    const jogadores = Array.from({ length: 40 }, (_, i) => jogador(`j${i}`, `Jogador ${i}`, 1980 + (i % 20)));
    const partidas = Array.from({ length: 104 }, (_, i) => {
      const dia = new Date(Date.UTC(2024, 9, 3 + i * 7));
      return partida(dia.toISOString().slice(0, 10), i % 5 === 0);
    });
    const presencas = partidas.flatMap((p) =>
      jogadores.filter((_, i) => i % 3 !== 0).map((j) => presenca(j.id, p.data)),
    );
    const hoje = partidas[103]!.data;
    const entrada = {
      hoje,
      mes: hoje.slice(0, 7),
      jogadores,
      partidas,
      presencas,
      configsPesos: CONFIGS,
    };
    for (let i = 0; i < 5; i++) calcularRanking(entrada);
    const tempos: number[] = [];
    for (let i = 0; i < 20; i++) {
      const t0 = performance.now();
      calcularRanking(entrada);
      tempos.push(performance.now() - t0);
    }
    tempos.sort((a, b) => a - b);
    expect(tempos[10]!).toBeLessThan(5);
  });
});

describe('data de início no meio do mês', () => {
  const entrada = (inicioPontuacao?: string) => ({
    hoje: '2026-10-20',
    mes: '2026-10',
    jogadores: [jogador('a', 'Ana', 1990), { ...jogador('b', 'Bia', 1991, undefined, 10), inicioPontuacao }],
    partidas: [partida('2026-10-01'), partida('2026-10-08'), partida('2026-10-15')],
    presencas: ['2026-10-01', '2026-10-08', '2026-10-15'].flatMap((d) => [presenca('a', d), presenca('b', d)]),
    configsPesos: CONFIGS,
  });

  it('rodada anterior ao início vira "–" e ptsInicial + rodadas = ptsFinal', () => {
    const linha = calcularRanking(entrada('2026-10-08')).linhas.find((l) => l.jogadorId === 'b')!;
    expect(linha.rodadas.map((r) => r.situacao)).toEqual(['fora', 'presente', 'presente']);
    expect(linha.rodadas[0]!.pontos).toBeNull();
    expect(linha.ptsInicial).toBe(0);
    expect(linha.ptsFinal).toBe(2);
  });

  it('entre o início do período e a data de início a rodada é "–", não falta (pontos nulos, não zero)', () => {
    const e = entrada('2026-10-15');
    const linha = calcularRanking(e).linhas.find((l) => l.jogadorId === 'b')!;
    expect(linha.rodadas).toEqual([
      { situacao: 'fora', pontos: null },
      { situacao: 'fora', pontos: null },
      { situacao: 'presente', pontos: 1 },
    ]);
    expect(linha.ptsInicial + linha.rodadas.reduce((s, r) => s + (r.pontos ?? 0), 0)).toBe(linha.ptsFinal);
    const ana = calcularRanking(e).linhas.find((l) => l.jogadorId === 'a')!;
    expect(ana.rodadas.map((r) => r.situacao)).toEqual(['presente', 'presente', 'presente']);
  });

  it('sem presença em dia de partida depois de S continua falta (0), antes de S é "–"', () => {
    const e = { ...entrada('2026-10-08'), presencas: [presenca('a', '2026-10-01'), presenca('b', '2026-10-15')] };
    const bia = calcularRanking(e).linhas.find((l) => l.jogadorId === 'b')!;
    expect(bia.rodadas.map((r) => [r.situacao, r.pontos])).toEqual([
      ['fora', null],
      ['falta', 0],
      ['presente', 1],
    ]);
  });

  it('o final de setembro é o inicial de outubro para todos', () => {
    const set = calcularRanking({ ...entrada('2026-10-08'), mes: '2026-09' }).linhas;
    const out = calcularRanking(entrada('2026-10-08')).linhas;
    expect(out.map((l) => [l.jogadorId, l.ptsInicial])).toEqual(set.map((l) => [l.jogadorId, l.ptsFinal]));
  });
});
