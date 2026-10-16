import { describe, expect, it } from 'vitest';
import { destinoDeEntrada, lerDestino } from './destino';

describe('destinoDeEntrada', () => {
  it('rota de admin leva o destino codificado', () => {
    expect(destinoDeEntrada('/admin/g-quinta/partidas', '?mes=2026-10')).toBe(
      '/entrar?destino=%2Fadmin%2Fg-quinta%2Fpartidas%3Fmes%3D2026-10',
    );
    expect(destinoDeEntrada('/conta/senha', '')).toBe('/entrar?destino=%2Fconta%2Fsenha');
    expect(destinoDeEntrada('/dono', '')).toBe('/entrar?destino=%2Fdono');
  });

  it.each(['/g/pelada-de-quinta', '/', '/entrar', '/entrar/nova-senha', '/administracao'])('%s → null', (p) => {
    expect(destinoDeEntrada(p, '')).toBeNull();
  });
});

describe('lerDestino (matriz adversarial)', () => {
  it.each([
    '//evil.com',
    '/\\evil.com',
    '%2F%2Fevil.com',
    '/%2F%2Fevil.com',
    '/%5Cevil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '/a%0d%0aSet-Cookie',
    '/a\r\nSet-Cookie',
    '/%',
    '',
    null,
    undefined,
  ])('recusa %j', (texto) => {
    expect(lerDestino(texto)).toBeNull();
  });

  it.each(['/admin?x=1', '/admin/g-quinta/partidas?mes=2026-10', '/'])('aceita %s', (texto) => {
    expect(lerDestino(texto)).toBe(texto);
  });
});
