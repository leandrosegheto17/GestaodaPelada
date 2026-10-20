import { describe, expect, it } from 'vitest';
import {
  erroPadrao,
  erroPartidaDuplicada,
  novosPesosCorpo,
  painelPesos,
  partidaDetalhe,
  partidaNova,
  partidasDoMes,
  salvarPartidaCorpo,
  usoPorSemana,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

const HOJE = '2026-10-22';
const JOGADOR = '123e4567-e89b-12d3-a456-426614174000';
const OUTRO = '123e4567-e89b-12d3-a456-426614174001';
const um = (nome: RegExp) => respostas(nome)[0]?.json;

describe('respostas do mockup', () => {
  it.each(respostas(/^pesos(-salvo)?\.json$/))('$nome passa em painelPesos', ({ json }) => {
    expect(painelPesos.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^partidas-.*\.json$/))('$nome passa em partidasDoMes', ({ json }) => {
    expect(partidasDoMes.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^partida-nova-.*\.json$/))('$nome passa em partidaNova', ({ json }) => {
    expect(partidaNova.safeParse(json).success).toBe(true);
  });
  it('partida-2026-10-15.json, uso e erros', () => {
    expect(partidaDetalhe.safeParse(um(/^partida-2026-10-15\.json$/)).success).toBe(true);
    for (const { json } of respostas(/^uso(-vazio)?\.json$/)) {
      expect(usoPorSemana.safeParse(json).success).toBe(true);
    }
    expect(erroPartidaDuplicada.safeParse(um(/^erro-partida-duplicada\.json$/)).success).toBe(true);
    expect(erroPadrao.safeParse(um(/^erro-data-futura\.json$/)).success).toBe(true);
    expect(erroPadrao.safeParse(um(/^erro-validacao-pesos\.json$/)).success).toBe(true);
  });
  it('chaves de campos dos erros existem nos corpos', () => {
    const data = (um(/^erro-data-futura\.json$/) as { erro: { campos: object } }).erro.campos;
    expect(Object.keys(data)).toEqual(['data']);
    const pesos = (um(/^erro-validacao-pesos\.json$/) as { erro: { campos: object } }).erro.campos;
    expect(Object.keys(pesos).every((c) => c in novosPesosCorpo.shape)).toBe(true);
  });
});

describe('novosPesosCorpo', () => {
  const ok = {
    presencaSemChuva: 1,
    presencaComChuva: 2,
    lesionadoSemChuva: 1,
    lesionadoComChuva: 1,
    expulsoSemChuva: -1,
    expulsoComChuva: -2,
  };
  it.each([
    [-11, false],
    [-10, true],
    [10, true],
    [11, false],
    [1.5, false],
    ['1', false],
    [Number.NaN, false],
  ])('peso %j → %s', (valor, aceito) => {
    expect(novosPesosCorpo.safeParse({ ...ok, expulsoSemChuva: valor }).success).toBe(aceito);
    expect(novosPesosCorpo.safeParse({ ...ok, expulsoComChuva: valor }).success).toBe(aceito);
  });
  it('o campo antigo "expulso" e a falta de um dos seis pesos são recusados', () => {
    const { expulsoSemChuva, ...semUm } = ok;
    expect(novosPesosCorpo.safeParse(semUm).success).toBe(false);
    expect(novosPesosCorpo.safeParse({ ...semUm, expulso: expulsoSemChuva }).success).toBe(false);
  });
  it('vigenteDesde e eDono são recusados', () => {
    expect(novosPesosCorpo.safeParse({ ...ok, vigenteDesde: HOJE }).success).toBe(false);
    expect(novosPesosCorpo.safeParse({ ...ok, eDono: true }).success).toBe(false);
  });
});

describe('salvarPartidaCorpo', () => {
  const schema = salvarPartidaCorpo(HOJE);
  const ok = {
    data: HOJE,
    choveu: false,
    marcacoes: [{ jogadorId: JOGADOR, situacao: 'presente' }],
  };
  it.each([
    [HOJE, true],
    ['2026-10-23', false],
    ['2026-02-30', false],
  ])('data %s → %s', (d, aceito) => {
    expect(schema.safeParse({ ...ok, data: d }).success).toBe(aceito);
  });
  it('data no futuro dá erro no campo data', () => {
    const r = schema.safeParse({ ...ok, data: '2026-10-23' });
    expect(r.success ? [] : r.error.issues[0]?.path).toEqual(['data']);
  });
  it('jogador repetido, situação falta e choveu texto são recusados', () => {
    const repetido = [...ok.marcacoes, { jogadorId: JOGADOR, situacao: 'lesionado' }];
    expect(schema.safeParse({ ...ok, marcacoes: repetido }).success).toBe(false);
    expect(schema.safeParse({ ...ok, marcacoes: [{ jogadorId: OUTRO, situacao: 'falta' }] }).success).toBe(false);
    expect(schema.safeParse({ ...ok, choveu: 'sim' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, eDono: true }).success).toBe(false);
  });
  it('jogadorId precisa ser uuid', () => {
    expect(schema.safeParse({ ...ok, marcacoes: [{ jogadorId: 'j-1', situacao: 'presente' }] }).success).toBe(false);
  });
});

describe('navegação e contagem', () => {
  const base = um(/^partidas-2026-10\.json$/) as {
    mes: string;
    navegacao: object;
    partidas: { contagem: object }[];
  };
  it('mês inválido e contagem negativa são recusados; mesSeguinte null é aceito', () => {
    expect(partidasDoMes.safeParse({ ...base, mes: '2026-13' }).success).toBe(false);
    expect(partidasDoMes.safeParse(base).success).toBe(true);
    const negativa = {
      ...base,
      partidas: [{ ...base.partidas[0], contagem: { presentes: -1, lesionados: 0, expulsos: 0 } }],
    };
    expect(partidasDoMes.safeParse(negativa).success).toBe(false);
  });
});
