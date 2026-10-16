import { describe, expect, it } from 'vitest';
import { erroPadrao, estenderErro } from '../src/index.js';
import { z } from 'zod';
import { respostas } from './apoio/respostas.js';

describe('erro padrão', () => {
  it.each(respostas(/^(erro-.*|sessao-entrar-(erro|bloqueado))\.json$/))(
    '$nome passa no schema',
    ({ json }) => {
      expect(erroPadrao.safeParse(json).success).toBe(true);
    },
  );

  it('recusa sem codigo ou sem mensagem', () => {
    expect(erroPadrao.safeParse({ erro: { mensagem: 'x' } }).success).toBe(false);
    expect(erroPadrao.safeParse({ erro: { codigo: 'x' } }).success).toBe(false);
  });

  it('estenderErro acrescenta campos do contexto', () => {
    const schema = estenderErro({ dataExistente: z.string() });
    expect(
      schema.safeParse({
        erro: { codigo: 'partida_ja_existe', mensagem: 'x', dataExistente: '2026-10-15' },
      }).success,
    ).toBe(true);
  });
});
