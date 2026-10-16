import { describe, expect, it } from 'vitest';
import { criarRelogio } from '../src/infraestrutura/relogio/index.js';
import { relogioFixo } from './apoio/relogio.js';

describe('relógio de São Paulo', () => {
  it('23:30 de 31/12 em São Paulo ainda é dezembro (02:30 UTC de 01/01)', () => {
    const r = criarRelogio(() => new Date('2027-01-01T02:30:00Z'));
    expect(r.hoje()).toBe('2026-12-31');
    expect(r.mes()).toBe('2026-12');
  });
  it('meia-noite exata em São Paulo já é o dia seguinte', () => {
    const r = criarRelogio(() => new Date('2027-01-01T03:00:00Z'));
    expect(r.hoje()).toBe('2027-01-01');
    expect(r.mes()).toBe('2027-01');
  });
  it('relógio injetado devolve o instante fixado', () => {
    const r = relogioFixo('2026-10-22', '09:00');
    expect(r.hoje()).toBe('2026-10-22');
    expect(r.agoraIso()).toBe('2026-10-22T12:00:00.000Z');
  });
  it('31/10 às 23:59 em São Paulo ainda é outubro', () => {
    const r = relogioFixo('2026-10-31', '23:59');
    expect(r.hoje()).toBe('2026-10-31');
    expect(r.mes()).toBe('2026-10');
  });
});
