import {
  DIAS_DA_SEMANA,
  FORMATOS_SIMULADOR,
  FREQUENCIAS,
  POSICOES,
  SITUACOES_COMERCIAIS,
  SITUACOES_PRESENCA,
  SITUACOES_RODADA,
  TIPOS_LANCAMENTO,
} from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import * as r from './index';

const TABELA = [
  ['situação da presença', SITUACOES_PRESENCA, r.ROTULO_SITUACAO_PRESENCA, r.ORDEM_SITUACAO_PRESENCA],
  ['situação da rodada', SITUACOES_RODADA, r.ROTULO_SITUACAO_RODADA, r.ORDEM_SITUACAO_RODADA],
  ['posição', POSICOES, r.ROTULO_POSICAO, r.ORDEM_POSICAO],
  ['frequência', FREQUENCIAS, r.ROTULO_FREQUENCIA, r.ORDEM_FREQUENCIA],
  ['dia da semana', DIAS_DA_SEMANA, r.ROTULO_DIA_SEMANA, r.ORDEM_DIA_SEMANA],
  ['situação comercial', SITUACOES_COMERCIAIS, r.ROTULO_SITUACAO_COMERCIAL, r.ORDEM_SITUACAO_COMERCIAL],
  ['tipo de lançamento', TIPOS_LANCAMENTO, r.ROTULO_TIPO_LANCAMENTO, r.ORDEM_TIPO_LANCAMENTO],
  ['formato do simulador', FORMATOS_SIMULADOR, r.ROTULO_FORMATO_SIMULADOR, r.ORDEM_FORMATO_SIMULADOR],
] as const;

describe.each(TABELA)('%s', (_nome, valores, rotulos, ordem) => {
  const mapa = rotulos as Record<string, unknown>;

  it('tem rótulo não vazio para cada valor e nenhum a mais', () => {
    expect(Object.keys(mapa).sort()).toEqual([...valores].sort());
    for (const v of valores) {
      const rotulo = mapa[v];
      const texto = typeof rotulo === 'string' ? rotulo : (rotulo as { texto: string }).texto;
      expect(texto.length).toBeGreaterThan(0);
    }
  });

  it('a ordem é permutação exata da tupla do contrato', () => {
    expect([...ordem].sort()).toEqual([...valores].sort());
    expect(new Set(ordem).size).toBe(ordem.length);
  });
});

describe('conferência com o mockup', () => {
  it('situação da presença: A, P, L, E com letras únicas', () => {
    expect(r.ORDEM_SITUACAO_PRESENCA.map((v) => r.rotuloSituacaoPresenca(v).letra)).toEqual(['A', 'P', 'L', 'E']);
    for (const { letra } of Object.values(r.ROTULO_SITUACAO_PRESENCA)) expect(letra).toMatch(/^[A-Z]$/);
  });

  it('plural e ordem da contagem', () => {
    expect(r.ORDEM_CONTAGEM.map((v) => r.ROTULO_SITUACAO_PRESENCA[v].plural)).toEqual([
      'Presentes',
      'Lesionados',
      'Expulsos',
      'Ausentes',
    ]);
    expect([...r.ORDEM_CONTAGEM].sort()).toEqual([...SITUACOES_PRESENCA].sort());
  });

  it('ordens', () => {
    expect(r.ORDEM_DIA_SEMANA[0]).toBe('domingo');
    expect(r.ORDEM_DIA_SEMANA[6]).toBe('sabado');
    expect(r.ORDEM_POSICAO[0]).toBe('goleiro');
    expect(r.ORDEM_POSICAO[3]).toBe('atacante');
    expect(r.ORDEM_SITUACAO_COMERCIAL[0]).toBe('uso_proprio');
    expect(r.ORDEM_SITUACAO_COMERCIAL[4]).toBe('cancelado');
  });

  it('textos com acento', () => {
    expect(r.rotuloDiaSemana('sabado')).toBe('Sábado');
    expect(r.rotuloDiaSemana('terca')).toBe('Terça');
    expect(r.rotuloSituacaoComercial('uso_proprio')).toBe('Uso próprio');
    expect(r.rotuloTipoLancamento('saida')).toBe('Saída');
    expect(r.rotuloFormatoSimulador('dois_times')).toBe('2 times (1º e 2º tempo)');
    expect(r.rotuloPosicao('meio_campo')).toBe('Meio-campo');
  });
});
