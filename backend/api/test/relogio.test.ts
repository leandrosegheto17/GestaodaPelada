import { describe, expect, it } from 'vitest';
import { criarRelogio, relogioFixo } from '../src/infraestrutura/relogio/index.js';

describe('relógio de São Paulo', () => {
  it('23:30 de 31/12 em São Paulo ainda é dezembro (02:30 UTC de 01/01)', () => {
    const r = relogioFixo('2027-01-01T02:30:00Z');
    expect(r.hoje()).toBe('2026-12-31');
    expect(r.mes()).toBe('2026-12');
  });
  it('meia-noite exata em São Paulo já é o dia seguinte', () => {
    const r = relogioFixo('2027-01-01T03:00:00Z');
    expect(r.hoje()).toBe('2027-01-01');
    expect(r.mes()).toBe('2027-01');
  });
  it('relógio injetado devolve o instante fixado', () => {
    const r = criarRelogio(() => new Date('2026-10-22T12:00:00Z'));
    expect(r.hoje()).toBe('2026-10-22');
    expect(r.agoraIso()).toBe('2026-10-22T12:00:00.000Z');
  });
});
