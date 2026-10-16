import { describe, expect, it } from 'vitest';
import { digitosDoTelefone, formatarTelefone, mascararTelefone } from './telefone';

describe('formatarTelefone', () => {
  it('11 dígitos viram (DD) 9XXXX-XXXX; o resto fica como veio', () => {
    expect(formatarTelefone('11987654321')).toBe('(11) 98765-4321');
    expect(formatarTelefone('123')).toBe('123');
  });
});

describe('mascararTelefone', () => {
  it.each([
    ['', ''],
    ['1', '(1'],
    ['11', '(11'],
    ['119', '(11) 9'],
    ['1198765', '(11) 98765'],
    ['11987654', '(11) 98765-4'],
    ['11987654321', '(11) 98765-4321'],
    ['(11)98765-4321', '(11) 98765-4321'],
    ['  11 9876a54321 ', '(11) 98765-4321'],
    ['119876543219999', '(11) 98765-4321'],
  ])('%j → %j', (digitado, esperado) => {
    expect(mascararTelefone(digitado)).toBe(esperado);
  });
});

describe('digitosDoTelefone', () => {
  it('só dígitos ou null', () => {
    expect(digitosDoTelefone('(11) 98765-4321')).toBe('11987654321');
    expect(digitosDoTelefone('  ')).toBeNull();
  });
});
