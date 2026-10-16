import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { acharEDono, compararEsquema, lerQuebrasAceitas, type Direcao } from './comparar.js';
import { conferir, serializar } from './snapshot-lib.js';

const json = (schema: z.ZodType, io: 'input' | 'output') => z.toJSONSchema(schema, { io, unrepresentable: 'any' });
const quebras = (direcao: Direcao, antes: z.ZodType, depois: z.ZodType) => {
  const io = direcao === 'entrada' ? 'input' : 'output';
  return compararEsquema('x', direcao, json(antes, io), json(depois, io));
};

describe('resposta', () => {
  const base = z.object({ a: z.string(), b: z.number() });
  it.each([
    ['campo removido', z.object({ a: z.string() })],
    ['campo renomeado', z.object({ a: z.string(), c: z.number() })],
    ['tipo trocado', z.object({ a: z.string(), b: z.string() })],
    ['obrigatório virou opcional', z.object({ a: z.string(), b: z.number().optional() })],
  ])('%s é quebra', (_nome, depois) => {
    expect(quebras('resposta', base, depois).length).toBeGreaterThan(0);
  });

  it('enum com valor removido é quebra; ampliado não', () => {
    expect(quebras('resposta', z.object({ e: z.enum(['a', 'b']) }), z.object({ e: z.enum(['a']) }))).toHaveLength(1);
    expect(quebras('resposta', z.object({ e: z.enum(['a']) }), z.object({ e: z.enum(['a', 'b']) }))).toEqual([]);
  });

  it('campo opcional novo e schema novo são aditivos', () => {
    expect(quebras('resposta', base, base.extend({ c: z.string().optional() }))).toEqual([]);
  });

  it('campo movido para objeto aninhado é remoção no caminho antigo', () => {
    const q = quebras('resposta', base, z.object({ a: z.string(), grupo: z.object({ b: z.number() }) }));
    expect(q.map((x) => x.caminho)).toContain('b');
  });

  it('campo dentro de array de objetos e ramo de união', () => {
    const lista = quebras(
      'resposta',
      z.object({ l: z.array(z.object({ x: z.string() })) }),
      z.object({ l: z.array(z.object({})) }),
    );
    expect(lista.map((x) => x.caminho)).toContain('l[].x');
    const uniaoAntes = z.discriminatedUnion('t', [
      z.object({ t: z.literal('a'), v: z.string() }),
      z.object({ t: z.literal('b') }),
    ]);
    const uniaoDepois = z.discriminatedUnion('t', [z.object({ t: z.literal('a') }), z.object({ t: z.literal('b') })]);
    expect(quebras('resposta', uniaoAntes, uniaoDepois).length).toBeGreaterThan(0);
  });

  it('nullable acrescentado é quebra', () => {
    expect(
      quebras('resposta', z.object({ a: z.string() }), z.object({ a: z.string().nullable() })).length,
    ).toBeGreaterThan(0);
  });

  it('quebra listada em QUEBRAS.md é aceita', () => {
    const antes = json(base, 'output');
    const depois = json(z.object({ a: z.string() }), 'output');
    expect(compararEsquema('x', 'resposta', antes, depois, [{ esquema: 'x', caminho: 'b' }])).toEqual([]);
  });
});

describe('entrada', () => {
  const base = z.object({ a: z.string(), b: z.string().optional() });
  it('campo novo obrigatório e optional → obrigatório são quebras', () => {
    expect(quebras('entrada', base, base.extend({ c: z.string() }))).toHaveLength(1);
    expect(quebras('entrada', base, z.object({ a: z.string(), b: z.string() }))).toHaveLength(1);
  });
  it('campo novo opcional e remoção de campo não quebram', () => {
    expect(quebras('entrada', base, base.extend({ c: z.string().optional() }))).toEqual([]);
    expect(quebras('entrada', base, z.object({ a: z.string() }))).toEqual([]);
  });
});

describe('eDono em entrada (G-11)', () => {
  it.each(['eDono', 'e_dono', 'EDONO', 'e-dono'])('%s, mesmo aninhado ou em array', (nome) => {
    const schema = z.object({
      conta: z.object({ itens: z.array(z.object({ [nome]: z.boolean() })) }),
    });
    expect(acharEDono(json(schema, 'input'))).toEqual([`conta.itens[].${nome}`.replace('[]', '')]);
  });
  it('em resposta o chamador não verifica: a função só olha o que recebe', () => {
    expect(acharEDono(json(z.object({ ok: z.boolean() }), 'input'))).toEqual([]);
  });
});

describe('QUEBRAS.md', () => {
  const cabecalho = '| esquema | caminho | mudança | deploy 1 | deploy 2 |\n|---|---|---|---|---|\n';
  it('lê linhas completas', () => {
    expect(lerQuebrasAceitas(`${cabecalho}| x | b | removido | aceita ambos | remove antigo |`)).toEqual([
      { esquema: 'x', caminho: 'b' },
    ]);
  });
  it('linha sem plano de deploy falha', () => {
    expect(() => lerQuebrasAceitas(`${cabecalho}| x | b | removido | | |`)).toThrow();
    expect(() => lerQuebrasAceitas('| x | b |')).toThrow();
  });
});

describe('conferir', () => {
  const a = { direcao: 'resposta' as const, esquema: json(z.object({ a: z.string() }), 'output') };
  const b = {
    direcao: 'resposta' as const,
    esquema: json(z.object({ a: z.string(), c: z.string().optional() }), 'output'),
  };
  it('mudança aditiva deixa o snapshot desatualizado', () => {
    const r = conferir({ x: b }, { x: a }, '');
    expect(r.quebras).toEqual([]);
    expect(r.desatualizados).toEqual(['x']);
  });
  it('esquema removido é quebra', () => {
    expect(conferir({}, { x: a }, '').quebras).toHaveLength(1);
  });
  it('instantâneo igual não está desatualizado', () => {
    expect(serializar(a)).toBe(serializar({ ...a }));
    expect(conferir({ x: a }, { x: a }, '').desatualizados).toEqual([]);
  });
});
