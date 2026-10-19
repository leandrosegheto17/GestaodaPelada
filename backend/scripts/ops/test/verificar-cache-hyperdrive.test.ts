import { describe, expect, it } from 'vitest';
import { cacheDoHyperdriveDesligado } from '../verificar-cache-hyperdrive';

const resposta = (result: unknown, success: unknown = true) => JSON.stringify({ success, errors: [], result });

describe('cacheDoHyperdriveDesligado', () => {
  it('passa com caching.disabled === true (formato da API)', () => {
    const corpo = resposta({ id: 'e06363bd85874f1eaffc6382da6d394b', name: 'x', caching: { disabled: true } });
    expect(() => cacheDoHyperdriveDesligado(corpo)).not.toThrow();
  });

  it.each([
    ['cache ligado', resposta({ caching: { disabled: false } })],
    ['caching ausente', resposta({ name: 'x' })],
    ['caching vazio', resposta({ caching: {} })],
    ['disabled como texto', resposta({ caching: { disabled: 'true' } })],
    ['disabled numérico', resposta({ caching: { disabled: 1 } })],
    ['result nulo', resposta(null)],
    ['result vazio', resposta({})],
    ['result lista', resposta([])],
    ['success false', resposta({ caching: { disabled: true } }, false)],
    ['success ausente', JSON.stringify({ result: { caching: { disabled: true } } })],
    [
      'erro da API',
      JSON.stringify({ success: false, errors: [{ code: 10000, message: 'Authentication error' }], result: null }),
    ],
    ['corpo vazio', ''],
    ['null', 'null'],
    ['objeto vazio', '{}'],
    ['lista', '[]'],
    ['JSON inválido', '<html>502 Bad Gateway</html>'],
  ])('falha fechado: %s', (_nome, corpo) => {
    expect(() => cacheDoHyperdriveDesligado(corpo)).toThrow();
  });

  it('a mensagem de erro não carrega o corpo recebido', () => {
    expect(() => cacheDoHyperdriveDesligado('segredo-xyz')).toThrow(/não é JSON/);
    try {
      cacheDoHyperdriveDesligado('segredo-xyz');
    } catch (e) {
      expect((e as Error).message).not.toContain('segredo-xyz');
    }
  });
});
