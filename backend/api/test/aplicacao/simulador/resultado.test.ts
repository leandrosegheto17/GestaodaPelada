import { sugestaoDois, sugestaoVarios } from '@pelada/contrato';
import { PESOS_PADRAO, sugerir, type JogadorSim } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import { centesimosParaDecimal } from '../../../src/aplicacao/elenco/nivel.js';
import type { EntradaMontada } from '../../../src/aplicacao/simulador/entrada.js';
import { paraSugestaoContrato } from '../../../src/aplicacao/simulador/resultado.js';
import { textoDoAviso } from '../../../src/aplicacao/simulador/textos-avisos.js';

const NOMES = ['Toninho', 'Bigode', 'Careca', 'Juninho', 'Marcão', 'Paulinho', 'Zé Carlos', 'Dudu', 'Gordo', 'Tiago'];

function montar(
  quantos: number,
  formato: 'dois_times' | 'varios_times',
  n: number,
  k: number | 'ilimitado',
): EntradaMontada {
  const aptos: JogadorSim[] = Array.from({ length: quantos }, (_, i) => ({
    id: `id-${i}`,
    so1oTempo: formato === 'dois_times' && i === 3,
    nivel: 450 + ((i * 97) % 300),
    semNota: i >= quantos - 2,
    idade: 30 + (i % 9),
  }));
  return {
    formato,
    n,
    k,
    data: '2026-10-22',
    aptos,
    historico: {
      jogadores: aptos.map((a, i) => ({
        id: a.id,
        apelido: NOMES[i] ?? `J${i}`,
        anoNascimento: 1980 + i,
        periodos: [{ inicio: '2026-01-01', fim: null }],
      })),
      partidas: [],
      presencas: [],
      configsPesos: [{ ...PESOS_PADRAO, vigenteDesde: '2026-01-01', registradoEm: '2026-01-01T00:00:00Z' }],
    },
    apelidos: new Map(aptos.map((a, i) => [a.id, NOMES[i] ?? `J${i}`])),
  };
}

function resolver(entrada: EntradaMontada) {
  const r = sugerir({
    formato: entrada.formato,
    n: entrada.n,
    k: entrada.k,
    dataPartida: entrada.data,
    aptos: entrada.aptos,
    historico: entrada.historico,
  });
  if (!r.valida) throw new Error('esperava sugestão válida');
  return r;
}

describe('centesimosParaDecimal', () => {
  it.each([
    [4410, 44.1],
    [630, 6.3],
    [635, 6.4],
    [634, 6.3],
    [0, 0],
  ])('%i → %d', (centesimos, esperado) => {
    expect(centesimosParaDecimal(centesimos)).toBe(esperado);
  });
});

describe('paraSugestaoContrato', () => {
  it('dois times: passa no contrato, com trocas em apelidos e K preservado', () => {
    const entrada = montar(10, 'dois_times', 4, 'ilimitado');
    const r = paraSugestaoContrato(resolver(entrada), entrada);
    const dois = sugestaoDois.parse(r);
    expect(dois.k).toBe('ilimitado');
    expect(dois.ordemPrioridade).toHaveLength(10);
    expect(dois.times.map((t) => t.nome)).toEqual(['Time A', 'Time B']);
    for (const time of dois.times) {
      for (const troca of time.trocas) {
        expect(NOMES).toContain(troca.sai);
        expect(NOMES).toContain(troca.entra);
      }
    }
    expect(dois.avisos.some((a) => a.tipo === 'sem_nota')).toBe(true);
  });

  it('vários times: nomes Time 1..T e o incompleto por último', () => {
    const entrada = montar(10, 'varios_times', 4, 'ilimitado');
    const vários = sugestaoVarios.parse(paraSugestaoContrato(resolver(entrada), entrada));
    expect(vários.times.map((t) => t.nome)).toEqual(['Time 1', 'Time 2', 'Time 3']);
    expect(vários.times.map((t) => t.incompleto)).toEqual([false, false, true]);
    expect(vários.times.map((t) => t.indicadores.jogadores)).toEqual([4, 4, 2]);
  });

  it('a mesma entrada com os aptos embaralhados dá o mesmo JSON', () => {
    const entrada = montar(10, 'varios_times', 4, 'ilimitado');
    const embaralhada = { ...entrada, aptos: [...entrada.aptos].reverse() };
    expect(JSON.stringify(paraSugestaoContrato(resolver(embaralhada), embaralhada))).toBe(
      JSON.stringify(paraSugestaoContrato(resolver(entrada), entrada)),
    );
  });
});

describe('textoDoAviso', () => {
  const ctx = { apelidoDe: (id: string) => id, nomeDoTime: (i: number) => `Time ${i + 1}` };

  it('sem nota: texto do mockup para dois e singular para um', () => {
    expect(textoDoAviso({ tipo: 'sem_nota', ids: ['Léo Baiano', 'Serginho'] }, ctx)).toBe(
      'Léo Baiano e Serginho não têm nota: usamos nível 5,5.',
    );
    expect(textoDoAviso({ tipo: 'sem_nota', ids: ['Léo'] }, ctx)).toBe('Léo não tem nota: usamos nível 5,5.');
  });

  it('incompleto pequeno com e sem sugestão de N', () => {
    expect(textoDoAviso({ tipo: 'incompleto_pequeno', tamanho: 1, nSugeridos: [3, 2] }, ctx)).toContain('N = 3 ou 2');
    expect(textoDoAviso({ tipo: 'incompleto_pequeno', tamanho: 1, nSugeridos: [] }, ctx)).not.toContain('Experimente');
  });
});
