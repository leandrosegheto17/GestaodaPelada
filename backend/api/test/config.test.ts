import { describe, expect, it } from 'vitest';
import { ConfigInvalida, lerConfig } from '../src/config/index.js';

const valida = { URL_PUBLICA: 'https://pelada.exemplo.dev', DONO_EMAIL: 'Dono@Exemplo.com' };

describe('lerConfig', () => {
  it('aceita a configuração válida e normaliza o e-mail', () => {
    expect(lerConfig(valida)).toEqual({
      urlPublica: 'https://pelada.exemplo.dev',
      enderecoNovo: null,
      donoEmail: 'dono@exemplo.com',
    });
  });
  it('aceita http só em localhost', () => {
    expect(lerConfig({ ...valida, URL_PUBLICA: 'http://localhost:8787' }).urlPublica).toBe(
      'http://localhost:8787',
    );
    expect(() => lerConfig({ ...valida, URL_PUBLICA: 'http://exemplo.dev' })).toThrow(
      ConfigInvalida,
    );
  });
  it.each([
    undefined,
    '',
    'sem-esquema',
    'https://x.dev/',
    'https://x.dev/caminho',
    'https://u:s@x.dev',
  ])('recusa URL_PUBLICA %j', (valor) => {
    expect(() => lerConfig({ ...valida, URL_PUBLICA: valor })).toThrow(ConfigInvalida);
  });
  it('ENDERECO_NOVO é opcional, mas se vier precisa ser válido', () => {
    expect(lerConfig({ ...valida, ENDERECO_NOVO: 'https://novo.exemplo.dev' }).enderecoNovo).toBe(
      'https://novo.exemplo.dev',
    );
    expect(() => lerConfig({ ...valida, ENDERECO_NOVO: 'lixo' })).toThrow(ConfigInvalida);
  });
  it('recusa DONO_EMAIL inválido ou acima de 254', () => {
    expect(() => lerConfig({ ...valida, DONO_EMAIL: 'x' })).toThrow(ConfigInvalida);
    expect(() => lerConfig({ ...valida, DONO_EMAIL: `${'a'.repeat(250)}@b.com` })).toThrow(
      ConfigInvalida,
    );
  });
  it('a mensagem do erro não traz o valor', () => {
    try {
      lerConfig({ ...valida, URL_PUBLICA: 'http://segredo.exemplo.dev' });
    } catch (e) {
      expect((e as Error).message).not.toContain('segredo');
    }
  });
});
