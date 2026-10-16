import { describe, expect, it } from 'vitest';
import { centavos, data, email, horario, mes, slug, uuid } from '../src/index.js';

const aceita = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => schema.safeParse(v).success;

describe('data', () => {
  it.each(['2024-02-29', '2026-10-16', '2026-12-31', '2026-01-01'])('aceita %s', (v) => {
    expect(aceita(data, v)).toBe(true);
  });
  it.each([
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-1-01',
    ' 2026-01-01',
    '2026-01-01 ',
    '٢٠٢٦-٠١-٠١',
    '2026-00-10',
    '2026-04-31',
    '',
  ])('recusa %j', (v) => {
    expect(aceita(data, v)).toBe(false);
  });
});

describe('mes', () => {
  it.each(['2026-01', '2026-12'])('aceita %s', (v) => expect(aceita(mes, v)).toBe(true));
  it.each(['2026-00', '2026-13', '2026-1', '2026-10-01'])('recusa %s', (v) => expect(aceita(mes, v)).toBe(false));
});

describe('horario', () => {
  it.each(['00:00', '23:59', '19:30'])('aceita %s', (v) => expect(aceita(horario, v)).toBe(true));
  it.each(['24:00', '23:60', '7:00', '07:0', ''])('recusa %j', (v) => expect(aceita(horario, v)).toBe(false));
});

describe('slug', () => {
  it('aceita 1 a 64 caracteres', () => {
    expect(aceita(slug, 'a')).toBe(true);
    expect(aceita(slug, 'a'.repeat(64))).toBe(true);
    expect(aceita(slug, 'pelada-de-quinta-2')).toBe(true);
  });
  it.each(['', 'a'.repeat(65), 'Pelada', 'pelada_x', 'pelada ç', 'pelada/x'])('recusa %j', (v) =>
    expect(aceita(slug, v)).toBe(false),
  );
});

describe('uuid', () => {
  it('aceita minúsculo com hífens', () => {
    expect(aceita(uuid, '123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });
  it.each([
    '123E4567-E89B-12D3-A456-426614174000',
    '123e4567e89b12d3a456426614174000',
    '{123e4567-e89b-12d3-a456-426614174000}',
    '',
  ])('recusa %s', (v) => expect(aceita(uuid, v)).toBe(false));
});

describe('centavos', () => {
  const valor = centavos(1, 99_999_999);
  it.each([1, 99_999_999])('aceita %s', (v) => expect(aceita(valor, v)).toBe(true));
  it.each([0, 100_000_000, 1.5, '100', Number.NaN, Infinity, 2 ** 53, null, undefined])('recusa %s', (v) =>
    expect(aceita(valor, v)).toBe(false),
  );
  it('aceita faixa negativa do saldo inicial', () => {
    const saldo = centavos(-99_999_999, 99_999_999);
    expect(aceita(saldo, -99_999_999)).toBe(true);
    expect(aceita(saldo, -100_000_000)).toBe(false);
  });
});

describe('email', () => {
  it('normaliza e aceita até 254 caracteres', () => {
    expect(email.parse('  Ana@Exemplo.com ')).toBe('ana@exemplo.com');
    const longo = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(60)}`;
    expect(longo.length).toBeLessThanOrEqual(254);
    expect(aceita(email, longo)).toBe(true);
  });
  it.each(['', 'sem-arroba', 'a@', '@b.com', `${'a'.repeat(250)}@b.com`])('recusa %j', (v) =>
    expect(aceita(email, v)).toBe(false),
  );
});
