import { describe, expect, it } from 'vitest';
import {
  erroJogadorComHistorico,
  erroPadrao,
  inativarCorpo,
  inicioCorpo,
  inicioCorpoBase,
  inicioEditarResposta,
  inicioPreviaResposta,
  jogadorCorpo,
  jogadorCorpoBase,
  jogadorDetalhe,
  jogadorEditarCorpo,
  jogadorEditarCorpoBase,
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
    expect(schema.safeParse({ ...ok, posicao: 'ponta' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, posicao: 'defensor' }).success).toBe(false);
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
  it('pontuação inicial: padrão 0, limites 0 e 9999, inteiro obrigatório', () => {
    expect(schema.parse(ok).pontuacaoInicial).toBe(0);
    expect(jogadorCorpoBase.parse(ok).pontuacaoInicial).toBe(0);
    for (const valor of [0, 1, 9999]) expect(schema.safeParse({ ...ok, pontuacaoInicial: valor }).success).toBe(true);
    for (const valor of [-1, 10000, 1.5, '5', null, Number.NaN]) {
      const r = schema.safeParse({ ...ok, pontuacaoInicial: valor });
      expect(r.success).toBe(false);
      expect(jogadorCorpoBase.safeParse({ ...ok, pontuacaoInicial: valor }).success).toBe(false);
    }
  });
  it('corpo de editar: pontuação inicial omitida fica indefinida; enviada segue a faixa', () => {
    const editar = jogadorEditarCorpo(HOJE);
    expect(editar.parse(ok).pontuacaoInicial).toBeUndefined();
    expect(jogadorEditarCorpoBase.parse(ok).pontuacaoInicial).toBeUndefined();
    expect(editar.parse({ ...ok, pontuacaoInicial: 0 }).pontuacaoInicial).toBe(0);
    for (const valor of [-1, 10000, 1.5, '5', null]) {
      expect(editar.safeParse({ ...ok, pontuacaoInicial: valor }).success).toBe(false);
    }
    expect(editar.safeParse({ ...ok, eDono: true }).success).toBe(false);
  });
  it('mensagem do campo de pontuação inicial', () => {
    const r = schema.safeParse({ ...ok, pontuacaoInicial: 10000 });
    expect(r.success ? '' : r.error.issues[0]?.message).toBe('Informe um número inteiro de 0 a 9999.');
  });
  it('o detalhe exige a pontuação inicial e a lista não a carrega', () => {
    const detalhe = respostas(/^jogador-toninho\.json$/)[0]?.json as Record<string, unknown>;
    expect(jogadorDetalhe.safeParse(detalhe).success).toBe(true);
    const sem = { ...detalhe };
    delete sem['pontuacaoInicial'];
    expect(jogadorDetalhe.safeParse(sem).success).toBe(false);
    const item = { id: 'j1', apelido: 'Zé', posicao: 'goleiro', nivel: 5, semNota: false };
    expect(listaJogadores.safeParse({ ativos: [{ ...item, pontuacaoInicial: 3 }], inativos: [] }).success).toBe(false);
  });
});

describe('bordas adicionais', () => {
  const schema = jogadorCorpo(HOJE);
  const ok = { apelido: 'Toninho', anoNascimento: 1978, posicao: 'atacante' };
  it('chaves de campos do erro de validação existem no corpo', () => {
    const erro = respostas(/^erro-validacao\.json$/)[0]?.json as { erro: { campos: Record<string, string> } };
    for (const chave of Object.keys(erro.erro.campos)) {
      expect(Object.keys(jogadorCorpoBase.shape)).toContain(chave);
    }
  });
  it('apelido só com espaços, ano decimal ou texto são recusados', () => {
    expect(schema.safeParse({ ...ok, apelido: '     ' }).success).toBe(false);
    expect(schema.safeParse({ ...ok, anoNascimento: 1978.5 }).success).toBe(false);
    expect(schema.safeParse({ ...ok, anoNascimento: '1978' }).success).toBe(false);
  });
  it('data inexistente e campos de servidor são recusados', () => {
    expect(schema.safeParse({ ...ok, dataEntrada: '2026-02-30' }).success).toBe(false);
    for (const extra of [{ id: 'x' }, { nivel: 5 }, { eDono: true }]) {
      expect(schema.safeParse({ ...ok, ...extra }).success).toBe(false);
    }
  });
  it('item inativo sem inativoDesde é recusado', () => {
    const item = { id: 'j1', apelido: 'Zé', posicao: 'goleiro', nivel: 5, semNota: false };
    expect(listaJogadores.safeParse({ ativos: [], inativos: [item] }).success).toBe(false);
    expect(listaJogadores.safeParse({ ativos: [], inativos: [{ ...item, inativoDesde: '2026-01-01' }] }).success).toBe(
      true,
    );
  });
  it('nota null é aceita no detalhe', () => {
    const base = respostas(/^jogador-toninho\.json$/)[0]?.json as { notas: { nota: number | null }[] };
    const notas = base.notas.map((n, i) => (i === 0 ? { ...n, nota: null } : n));
    expect(jogadorDetalhe.safeParse({ ...base, notas }).success).toBe(true);
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

describe('data de início', () => {
  const schema = inicioCorpo(HOJE);
  it('aceita hoje e o passado; recusa amanhã, data inexistente, vazio e formato errado', () => {
    expect(schema.safeParse({ data: HOJE }).success).toBe(true);
    expect(schema.safeParse({ data: '2020-01-31' }).success).toBe(true);
    for (const data of ['2026-10-23', '2026-02-30', '', '22/10/2026', '2026-1-5', '２０２６-10-01']) {
      expect(schema.safeParse({ data }).success).toBe(false);
    }
    expect(schema.safeParse({}).success).toBe(false);
  });
  it('recusa campo extra e tipo errado; o corpo estático também', () => {
    expect(schema.safeParse({ data: HOJE, dataEntrada: HOJE }).success).toBe(false);
    expect(schema.safeParse({ data: 20261001 }).success).toBe(false);
    expect(inicioCorpoBase.safeParse({ data: '2026-10-23' }).success).toBe(true);
    expect(inicioCorpoBase.safeParse({ data: '2026-02-30' }).success).toBe(false);
  });
  it('resposta da prévia: números, posição anulável e sem campo extra', () => {
    const ok = {
      acumuladoAntes: 33,
      acumuladoDepois: 1,
      posicaoAntes: 2,
      posicaoDepois: null,
      rodadasQuePassamAConstar: 0,
    };
    expect(inicioPreviaResposta.safeParse(ok).success).toBe(true);
    expect(inicioPreviaResposta.safeParse({ ...ok, apelido: 'x' }).success).toBe(false);
    expect(inicioPreviaResposta.safeParse({ ...ok, rodadasQuePassamAConstar: -1 }).success).toBe(false);
  });
  it('resposta da edição: data e se houve alteração', () => {
    expect(inicioEditarResposta.safeParse({ inicio: HOJE, alterado: false }).success).toBe(true);
    expect(inicioEditarResposta.safeParse({ inicio: HOJE }).success).toBe(false);
  });
});

describe('edição genérica e dataEntrada', () => {
  it('ainda aceita dataEntrada (o app anterior a envia); a API a ignora', () => {
    const ok = { apelido: 'Toninho', anoNascimento: 1978, posicao: 'atacante', dataEntrada: '2026-01-05' };
    expect(jogadorEditarCorpoBase.safeParse(ok).success).toBe(true);
    expect(jogadorEditarCorpo(HOJE).safeParse(ok).success).toBe(true);
  });
});
