import { describe, expect, it } from 'vitest';
import {
  DIAS_DA_SEMANA,
  ESCOPOS_SESSAO,
  FORMATOS_SIMULADOR,
  FREQUENCIAS,
  POSICOES,
  SITUACOES_COMERCIAIS,
  SITUACOES_PRESENCA,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

function valores(no: unknown, campo: string, saida: Set<string> = new Set()): Set<string> {
  if (Array.isArray(no)) no.forEach((n) => valores(n, campo, saida));
  else if (no && typeof no === 'object') {
    for (const [k, v] of Object.entries(no)) {
      if (k === campo && typeof v === 'string') saida.add(v);
      else valores(v, campo, saida);
    }
  }
  return saida;
}

const todas = respostas(/\.json$/);
const usados = (campo: string) => new Set(todas.flatMap(({ json }) => [...valores(json, campo)]));

describe('enums cobrem os valores das respostas do mockup', () => {
  it.each([
    ['posicao', POSICOES],
    ['frequencia', FREQUENCIAS],
    ['diaSemana', DIAS_DA_SEMANA],
    ['situacaoComercial', SITUACOES_COMERCIAIS],
    ['formato', FORMATOS_SIMULADOR],
    ['escopo', ESCOPOS_SESSAO],
  ] as const)('%s', (campo, enumeracao) => {
    for (const valor of usados(campo)) expect(enumeracao as readonly string[]).toContain(valor);
  });

  it('situação de presença conhecida', () => {
    expect(SITUACOES_PRESENCA).toEqual(['ausente', 'presente', 'lesionado', 'expulso']);
  });
});
