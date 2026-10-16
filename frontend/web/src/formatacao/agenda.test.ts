import { DIAS_DA_SEMANA, FREQUENCIAS } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { descreverAgenda } from './agenda';

describe('descreverAgenda', () => {
  it.each([
    ['quinta', 'semanal', '20:00', 'Toda quinta · 20:00'],
    ['domingo', 'semanal', '09:00', 'Todo domingo · 09:00'],
    ['sabado', 'semanal', '16:30', 'Todo sábado · 16:30'],
    ['terca', 'semanal', '21:00', 'Toda terça · 21:00'],
    ['domingo', 'quinzenal', '09:00', 'Domingo, quinzenal · 09:00'],
    ['quinta', 'mensal', '20:00', 'Quinta, mensal · 20:00'],
  ] as const)('%s %s %s', (diaSemana, frequencia, horario, esperado) => {
    expect(descreverAgenda({ diaSemana, frequencia, horario })).toBe(esperado);
  });

  it('todo valor dos enums do contrato tem saída', () => {
    for (const diaSemana of DIAS_DA_SEMANA) {
      for (const frequencia of FREQUENCIAS) {
        expect(descreverAgenda({ diaSemana, frequencia, horario: '20:00' })).toMatch(/20:00$/);
      }
    }
  });
});
