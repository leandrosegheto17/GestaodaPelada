import { describe, expect, it } from 'vitest';
import { destinoDeEntrada } from './destino';

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
