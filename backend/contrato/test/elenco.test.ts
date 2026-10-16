import { describe, expect, it } from 'vitest';
import {
  erroJogadorComHistorico,
  erroPadrao,
  inativarCorpo,
  jogadorCorpo,
  jogadorCorpoBase,
  jogadorDetalhe,
  listaJogadores,
  notaValor,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

const HOJE = '2026-10-22';

describe('respostas do mockup', () => {
  it.each(respostas(/^jogadores.*\.json$/))('$nome passa em listaJogadores', ({ json }) => {
    expect(listaJogadores.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^jogador-(toninho|sem-habilidades)\.json$/))('$nome passa em jogadorDetalhe', ({ json }) => {
    expect(jogadorDetalhe.safeParse(json).success).toBe(true);
  });
  it('erro 409 com histórico e erro de validação', () => {
    expect(erroJogadorComHistorico.safeParse(respostas(/^erro-jogador-com-historico\.json$/)[0]?.json).success).toBe(
      true,
    );
    expect(erroPadrao.safeParse(respostas(/^erro-validacao\.json$/)[0]?.json).success).toBe(true);
  });
});

describe('jogadorCorpo', () => {
  const schema = jogadorCorpo(HOJE);
  const ok = { apelido: 'Toninho', anoNascimento: 1978, posicao: 'atacante' };
  it.each([
    [1, false],
    [2, true],
    [30, true],
    [31, false],
  ])('apelido com %i caracteres → %s', (n, aceito) => {
    expect(schema.safeParse({ ...ok, apelido: 'a'.repeat(n) }).success).toBe(aceito);
  });
  it.each([
    [1939, false],
    [1940, true],
    [2016, true],
    [2017, false],
  ])('ano %i → %s (hoje = 2026)', (ano, aceito) => {
    expect(schema.safeParse({ ...ok, anoNascimento: ano }).success).toBe(aceito);
  });
  it('o ano máximo muda com o hoje informado', () => {
    expect(jogadorCorpo('2027-01-01').safeParse({ ...ok, anoNascimento: 2017 }).success).toBe(true);
  });
  it('data de entrada no futuro é recusada no campo dataEntrada', () => {
    const r = schema.safeParse({ ...ok, dataEntrada: '2026-10-23' });
    expect(r.success).toBe(false);
    expect(schema.safeParse({ ...ok, dataEntrada: HOJE }).success).toBe(true);
  });
  it('posição fora do enum e campo extra são recusados', () => {
    expect(schema.safeParse({ ...ok, posicao: 'lateral' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, eDono: true }).success).toBe(false);
  });
  it.each([
    ['(11) 98765-4321', '11987654321'],
    ['11987654321', '11987654321'],
    ['', null],
    [null, null],
    [undefined, null],
  ])('telefone %j normaliza para %j', (entrada, esperado) => {
    const r = schema.parse({ ...ok, telefone: entrada });
    expect(r.telefone).toBe(esperado);
  });
  it.each(['(11) 88765-4321', '(01) 98765-4321', '1198765432', '119876543211', '(11)98765-4321', 'abc'])(
    'telefone inválido %j',
    (entrada) => {
      expect(schema.safeParse({ ...ok, telefone: entrada }).success).toBe(false);
    },
  );
  it('o corpo estático do registro aceita os mesmos campos', () => {
    expect(jogadorCorpoBase.safeParse(ok).success).toBe(true);
  });
});

describe('inativar e nota', () => {
  it('data de saída no futuro é recusada', () => {
    expect(inativarCorpo(HOJE).safeParse({ dataSaida: '2026-10-23' }).success).toBe(false);
    expect(inativarCorpo(HOJE).safeParse({ dataSaida: HOJE }).success).toBe(true);
    expect(inativarCorpo(HOJE).safeParse({}).success).toBe(true);
  });
  it.each([
    [0, false],
    [1, true],
    [10, true],
    [11, false],
    [5.5, false],
  ])('nota %d → %s', (nota, aceito) => {
    expect(notaValor.safeParse(nota).success).toBe(aceito);
  });
});
