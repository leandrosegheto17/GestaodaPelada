import { describe, expect, it } from 'vitest';
import { previaDosPeriodos } from '../../src/index.js';
import { CONFIGS, jogador, partida, presenca } from '../apoio/historico.js';

const HOJE = '2026-10-20';
const partidas = ['2026-09-28', '2026-10-12', '2026-10-15', '2026-10-19'].map((d) => partida(d));
const rival = (id: string, inicial: number) => jogador(id, id, 1991, [{ inicio: '2026-01-01', fim: null }], inicial);
const alvo = (periodos = [{ inicio: '2026-10-20', fim: null as string | null }]) =>
  jogador('v', 'Vandre', 1990, periodos, 5);

const previa = (
  periodosNovos: { inicio: string; fim: string | null }[],
  presencas = [presenca('v', '2026-10-19')],
  jogadores = [alvo(), rival('r1', 40), rival('r2', 3)],
  partidasUsadas = partidas,
) =>
  previaDosPeriodos({
    hoje: HOJE,
    jogadorId: 'v',
    periodosNovos,
    jogadores,
    partidas: partidasUsadas,
    presencas,
    configsPesos: CONFIGS,
  });

describe('previaDosPeriodos', () => {
  it('antecipar retorno: as rodadas passam a constar como falta e o acumulado não muda (RN-31)', () => {
    const r = previa([{ inicio: '2026-10-12', fim: null }], []);
    expect(r.rodadasQuePassamAConstar).toEqual([
      { data: '2026-10-12', situacao: 'falta' },
      { data: '2026-10-15', situacao: 'falta' },
      { data: '2026-10-19', situacao: 'falta' },
    ]);
    expect(r.rodadasQueDeixamDeConstar).toEqual([]);
    expect(r.acumuladoDepois).toBe(r.acumuladoAntes);
    expect(r.posicaoDepois).toBe(r.posicaoAntes);
  });

  it('presença já lançada na data passa a constar com a situação certa e soma os pontos', () => {
    const presencas = [
      presenca('v', '2026-10-12', 'presente'),
      presenca('v', '2026-10-15', 'lesionado'),
      presenca('v', '2026-10-19', 'expulso'),
    ];
    const r = previa([{ inicio: '2026-10-12', fim: null }], presencas);
    expect(r.rodadasQuePassamAConstar.map((x) => x.situacao)).toEqual(['presente', 'lesionado', 'expulso']);
    // O acumulado vem de `acumuladoPorInicio`: já contava as presenças lançadas, mesmo fora dos períodos.
    expect(r.acumuladoAntes).toBe(5 + 1 + 1 - 1);
    expect(r.acumuladoDepois).toBe(r.acumuladoAntes);
  });

  it('adiar o retorno ou antecipar a saída: rodadas deixam de constar, com a data', () => {
    const ativo = alvo([{ inicio: '2026-09-01', fim: null }]);
    const adiar = previa([{ inicio: '2026-10-15', fim: null }], [], [ativo, rival('r1', 40)]);
    expect(adiar.rodadasQueDeixamDeConstar).toEqual([{ data: '2026-09-28' }, { data: '2026-10-12' }]);
    expect(adiar.rodadasQuePassamAConstar).toEqual([]);
    const sair = previa([{ inicio: '2026-09-01', fim: '2026-10-13' }], [], [ativo, rival('r1', 40)]);
    expect(sair.rodadasQueDeixamDeConstar).toEqual([{ data: '2026-10-15' }, { data: '2026-10-19' }]);
    expect(sair.posicaoAntes).toBe(2);
    expect(sair.posicaoDepois).toBeNull();
  });

  it('jogador inativo hoje que passa a ativo: posição antes nula; e o inverso', () => {
    const inativo = alvo([{ inicio: '2026-09-01', fim: '2026-10-01' }]);
    const volta = previa([{ inicio: '2026-09-01', fim: null }], [], [inativo, rival('r1', 40)]);
    expect(volta.posicaoAntes).toBeNull();
    expect(volta.posicaoDepois).not.toBeNull();
    const ativo = alvo([{ inicio: '2026-09-01', fim: null }]);
    const sai = previa([{ inicio: '2026-09-01', fim: '2026-10-01' }], [], [ativo, rival('r1', 40)]);
    expect(sai.posicaoAntes).not.toBeNull();
    expect(sai.posicaoDepois).toBeNull();
  });

  it('correção sem efeito: listas vazias e valores iguais', () => {
    const r = previa([{ inicio: '2026-10-20', fim: null }]);
    expect(r.rodadasQuePassamAConstar).toEqual([]);
    expect(r.rodadasQueDeixamDeConstar).toEqual([]);
    expect(r.acumuladoDepois).toBe(r.acumuladoAntes);
    expect(r.posicaoDepois).toBe(r.posicaoAntes);
  });

  it('pesos que mudam no meio: usa os pesos vigentes na data de cada partida', () => {
    const ps = ['2026-08-27', '2026-09-03'].map((d, i) => partida(d, i === 1));
    const presencas = [presenca('v', '2026-08-27'), presenca('v', '2026-09-03')];
    const r = previa([{ inicio: '2026-08-01', fim: null }], presencas, [alvo(), rival('r1', 40)], ps);
    expect(r.acumuladoAntes).toBe(5 + 1 + 2);
    expect(r.acumuladoDepois).toBe(5 + 1 + 2);
  });

  it('só o alvo muda: o acumulado dos outros não entra e a entrada não é mutada', () => {
    const jogadores = [alvo(), rival('r1', 40), rival('r2', 3)];
    const periodosNovos = [{ inicio: '2026-10-12', fim: null }];
    const copia = structuredClone({ jogadores, periodosNovos });
    const r = previa(periodosNovos, [], jogadores);
    expect(r.posicaoAntes).toBe(2);
    expect({ jogadores, periodosNovos }).toEqual(copia);
  });

  it('jogador desconhecido lança erro', () => {
    expect(() =>
      previaDosPeriodos({
        hoje: HOJE,
        jogadorId: 'x',
        periodosNovos: [],
        jogadores: [],
        partidas,
        presencas: [],
        configsPesos: CONFIGS,
      }),
    ).toThrow();
  });
});
