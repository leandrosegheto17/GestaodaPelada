import { describe, expect, it } from 'vitest';
import { dataEmSaoPaulo, paraMetadadosGrupo } from '../../../src/aplicacao/dono/metadados-grupo.js';

describe('metadados do grupo', () => {
  it('a data vira o dia de São Paulo (virada de dia)', () => {
    expect(dataEmSaoPaulo(new Date('2026-10-16T02:30:00Z'))).toBe('2026-10-15');
    expect(dataEmSaoPaulo(new Date('2026-10-16T03:00:00Z'))).toBe('2026-10-16');
  });

  it('só devolve os campos de metadados', () => {
    const r = paraMetadadosGrupo({
      id: 'g',
      nome: 'Pelada',
      slug: 'pelada',
      diaSemana: 'quinta',
      frequencia: 'semanal',
      horario: '20:00',
      situacaoComercial: 'uso_proprio',
      trialInicio: null,
      arquivadoEm: null,
      criadoPor: 'c',
      criadoEm: new Date('2026-02-05T12:00:00Z'),
    });
    expect(Object.keys(r).sort()).toEqual(
      [
        'arquivadoEm',
        'criadoEm',
        'diaSemana',
        'frequencia',
        'horario',
        'id',
        'inicioTrial',
        'nome',
        'situacaoComercial',
      ].sort(),
    );
    expect(r.criadoEm).toBe('2026-02-05');
  });
});
