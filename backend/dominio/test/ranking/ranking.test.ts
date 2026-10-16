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
    const jogadores = Array.from({ length: 40 }, (_, i) =>
      jogador(`j${i}`, `Jogador ${i}`, 1980 + (i % 20)),
    );
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
