import { describe, expect, it } from 'vitest';
import { dataSugeridaPartida, proximoDiaDeJogo } from '../../src/index.js';

const QUINTA = 4;
const DOMINGO = 0;

describe('dia de jogo', () => {
  it('hoje é dia de jogo: ambos devolvem hoje', () => {
    expect(dataSugeridaPartida('2026-10-22', QUINTA)).toBe('2026-10-22');
    expect(proximoDiaDeJogo('2026-10-22', QUINTA)).toBe('2026-10-22');
  });
  it('sexta: sugerida é ontem, próximo é na semana seguinte', () => {
    expect(dataSugeridaPartida('2026-10-23', QUINTA)).toBe('2026-10-22');
    expect(proximoDiaDeJogo('2026-10-23', QUINTA)).toBe('2026-10-29');
  });
  it('vira o mês e o ano', () => {
    expect(dataSugeridaPartida('2026-11-02', DOMINGO)).toBe('2026-11-01');
    expect(dataSugeridaPartida('2026-11-02', QUINTA)).toBe('2026-10-29');
    expect(dataSugeridaPartida('2027-01-01', QUINTA)).toBe('2026-12-31');
  });
  it('resultado em 29/02', () => {
    expect(dataSugeridaPartida('2028-03-01', 2)).toBe('2028-02-29');
  });
});
