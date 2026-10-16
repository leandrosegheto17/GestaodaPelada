import { describe, expect, it } from 'vitest';
import {
  avaliacaoSimulador,
  avaliarCorpo,
  contextoSimulador,
  entradaPrevia,
  entradaSimulador,
  escalacaoCorpo,
  previaSimulador,
  sugestaoSimulador,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const aptosDois = (quantos: number) => Array.from({ length: quantos }, (_, i) => ({ id: id(i + 1), so1oTempo: false }));
const aptosVarios = (quantos: number) => Array.from({ length: quantos }, (_, i) => ({ id: id(i + 1) }));
const dois = { formato: 'dois_times', data: '2026-10-22', n: 7, k: 2, aptos: aptosDois(14) };

describe('respostas do mockup', () => {
  it.each(respostas(/^simulador-contexto.*\.json$/))('$nome passa em contextoSimulador', ({ json }) => {
    expect(contextoSimulador.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^simulador-previa.*\.json$/))('$nome passa em previaSimulador', ({ json }) => {
    expect(previaSimulador.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^simulador-sugestao.*\.json$/))('$nome passa em sugestaoSimulador', ({ json }) => {
    expect(sugestaoSimulador.safeParse(json).success).toBe(true);
  });
  it('a resposta de avaliar não tem ordem de prioridade', () => {
    const [dois2] = respostas(/^simulador-sugestao-dois\.json$/);
    expect(avaliacaoSimulador.safeParse(dois2?.json).success).toBe(false);
    const semOrdem: Record<string, unknown> = { ...(dois2?.json as Record<string, unknown>) };
    delete semOrdem.ordemPrioridade;
    expect(avaliacaoSimulador.safeParse(semOrdem).success).toBe(true);
  });
});

describe('entrada do simulador', () => {
  it.each([
    [1, false],
    [2, true],
    [11, true],
    [12, false],
  ])('N = %i → %s', (n, aceito) => {
    expect(entradaSimulador.safeParse({ ...dois, n }).success).toBe(aceito);
  });

  it.each([
    [-1, false],
    [0, true],
    [20, true],
    [21, false],
    ['ilimitado', true],
    ['infinito', false],
  ])('K = %j → %s', (k, aceito) => {
    expect(entradaSimulador.safeParse({ ...dois, k }).success).toBe(aceito);
  });

  it.each([
    [0, false],
    [1, true],
    [60, true],
    [61, false],
  ])('%i aptos → %s', (quantos, aceito) => {
    expect(entradaSimulador.safeParse({ ...dois, aptos: aptosDois(quantos) }).success).toBe(aceito);
  });

  it('id repetido, id que não é uuid e formato desconhecido são recusados', () => {
    const repetido = [...aptosDois(3), { id: id(1), so1oTempo: true }];
    expect(entradaSimulador.safeParse({ ...dois, aptos: repetido }).success).toBe(false);
    expect(entradaSimulador.safeParse({ ...dois, aptos: [{ id: 'j-alemao', so1oTempo: false }] }).success).toBe(false);
    expect(entradaSimulador.safeParse({ ...dois, formato: 'tres_times' }).success).toBe(false);
  });

  it('vários times não aceitam K nem "só 1º tempo"', () => {
    const varios = { formato: 'varios_times', data: '2026-10-22', n: 4, aptos: aptosVarios(10) };
    expect(entradaSimulador.safeParse(varios).success).toBe(true);
    expect(entradaSimulador.safeParse({ ...varios, k: 2 }).success).toBe(false);
    expect(entradaSimulador.safeParse({ ...varios, aptos: aptosDois(10) }).success).toBe(false);
  });

  it('a prévia dispensa a data', () => {
    const semData: Record<string, unknown> = { ...dois };
    delete semData.data;
    expect(entradaPrevia.safeParse(semData).success).toBe(true);
  });
});

describe('avaliar e escalação', () => {
  const times = [
    { titulares: aptosDois(3), entramNo2oTempo: [] },
    { titulares: aptosDois(6).slice(3), entramNo2oTempo: [] },
  ];
  const valido = { ...dois, aptos: aptosDois(7), composicao: { times, naoEntra: [id(7)] } };

  it('composição válida é aceita', () => {
    expect(avaliarCorpo.safeParse(valido).success).toBe(true);
  });

  it('id repetido entre titulares e não entra, id fora dos aptos e 3 times são recusados', () => {
    expect(avaliarCorpo.safeParse({ ...valido, composicao: { times, naoEntra: [id(1)] } }).success).toBe(false);
    expect(avaliarCorpo.safeParse({ ...valido, composicao: { times, naoEntra: [id(99)] } }).success).toBe(false);
    expect(
      avaliarCorpo.safeParse({ ...valido, composicao: { times: [...times, times[0]], naoEntra: [] } }).success,
    ).toBe(false);
  });

  it('vários times: composição com id fora dos aptos é recusada', () => {
    const varios = {
      formato: 'varios_times',
      data: '2026-10-22',
      n: 2,
      aptos: aptosVarios(4),
      composicao: { times: [{ jogadores: [id(1), id(2)] }, { jogadores: [id(3), id(4)] }] },
    };
    expect(avaliarCorpo.safeParse(varios).success).toBe(true);
    expect(avaliarCorpo.safeParse({ ...varios, composicao: { times: [{ jogadores: [id(1), id(9)] }] } }).success).toBe(
      false,
    );
  });

  it('escalação: corpo válido nos dois formatos; campos que não existem são recusados', () => {
    const corpoDois = {
      formato: 'dois_times',
      data: '2026-10-22',
      n: 7,
      k: 'ilimitado',
      composicao: valido.composicao,
    };
    expect(escalacaoCorpo.safeParse(corpoDois).success).toBe(true);
    const corpoVarios = {
      formato: 'varios_times',
      data: '2026-10-22',
      n: 4,
      composicao: { times: [{ jogadores: [id(1)] }] },
    };
    expect(escalacaoCorpo.safeParse(corpoVarios).success).toBe(true);
    expect(escalacaoCorpo.safeParse({ ...corpoDois, eDono: true }).success).toBe(false);
    expect(escalacaoCorpo.safeParse({ ...corpoDois, grupoId: 'x' }).success).toBe(false);
  });
});
