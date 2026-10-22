import { describe, expect, it } from 'vitest';
import {
  PESOS_PADRAO,
  acumuladoPorInicio,
  inicioEfetivo,
  rodadasDoJogador,
  criarResolvedorDePesos,
  type ConfigPesos,
  type PresencaDoJogador,
} from '../../src/index.js';

const antiga: ConfigPesos = { ...PESOS_PADRAO, vigenteDesde: '2026-02-05', registradoEm: '2026-02-05T10:00' };
const nova: ConfigPesos = {
  ...PESOS_PADRAO,
  presencaComChuva: 2,
  vigenteDesde: '2026-10-01',
  registradoEm: '2026-09-30T10:00',
};
const p = (data: string, choveu = false, situacao: PresencaDoJogador['situacao'] = 'presente'): PresencaDoJogador => ({
  data,
  choveu,
  situacao,
});

// Vandré: presenças desde 20/09, pontuação inicial 30.
const vandre = [p('2026-09-20'), p('2026-09-27'), p('2026-10-11')];
const conta = (inicio: string | undefined, presencas: PresencaDoJogador[], referencia: string, inicial = 30) =>
  acumuladoPorInicio({ inicio, pontuacaoInicial: inicial, presencas, configs: [antiga, nova], referencia });

describe('acumuladoPorInicio', () => {
  it('sem data de início soma a inicial e todas as presenças até a referência', () => {
    expect(conta(undefined, vandre, '2026-10-11')).toBe(33);
    expect(conta(undefined, vandre, '2026-09-26')).toBe(31);
    expect(conta(undefined, [], '2026-10-11')).toBe(30);
  });

  it('Vandré: início na primeira presença conta a inicial e todas as presenças', () => {
    expect(conta('2026-09-20', vandre, '2026-10-20')).toBe(33);
  });

  it('recuar antes da primeira presença, sem lançamento no intervalo, não muda o acumulado', () => {
    expect(conta('2026-08-01', vandre, '2026-10-20')).toBe(conta('2026-09-20', vandre, '2026-10-20'));
  });

  it('Kim: início hoje zera, inclusive a inicial; voltar devolve tudo', () => {
    expect(conta('2026-10-20', vandre, '2026-10-20')).toBe(0);
    expect(conta('2026-09-20', vandre, '2026-10-20')).toBe(33);
  });

  it('sem presença no histórico a inicial conta, qualquer que seja a data de início', () => {
    expect(conta('2026-10-20', [], '2026-10-25')).toBe(30);
  });

  it('início na primeira presença conta a inicial; um dia depois não conta', () => {
    expect(conta('2026-09-20', vandre, '2026-10-20')).toBe(33);
    expect(conta('2026-09-21', vandre, '2026-10-20')).toBe(2);
  });

  it('presença anterior ao início fica fora da soma', () => {
    expect(conta('2026-09-27', vandre, '2026-10-20')).toBe(2);
  });

  it('presença na data de início e na referência entra (limites inclusivos)', () => {
    expect(conta('2026-09-27', vandre, '2026-09-27')).toBe(1);
  });

  it('referência anterior ao início soma só a inicial, quando ela vale', () => {
    expect(conta('2026-09-20', vandre, '2026-09-01')).toBe(30);
    expect(conta('2026-09-27', vandre, '2026-09-01')).toBe(0);
  });

  it('RN-28: recuar sem lançamento em [S’, S) não muda o acumulado de ninguém; com lançamento só muda o dele', () => {
    const outro = [p('2026-09-27')];
    const antes = [conta('2026-09-27', outro, '2026-10-20', 0), conta('2026-09-20', vandre, '2026-10-20')];
    const depois = [conta('2026-09-01', outro, '2026-10-20', 0), conta('2026-09-20', vandre, '2026-10-20')];
    expect(depois).toEqual(antes);
    const comLancamento = [p('2026-09-13'), ...outro];
    expect(conta('2026-09-01', comLancamento, '2026-10-20', 0)).toBe(2);
    expect(conta('2026-09-27', comLancamento, '2026-10-20', 0)).toBe(1);
  });

  it('o final de um mês é o inicial do seguinte (mesma função, véspera do dia 1)', () => {
    const presencas = [p('2026-09-27'), p('2026-10-04')];
    const finalDeSetembro = conta('2026-09-27', presencas, '2026-09-30');
    const inicialDeOutubro = conta('2026-09-27', presencas, '2026-10-01', 30);
    expect(inicialDeOutubro).toBe(finalDeSetembro);
  });

  it('troca de pesos no meio do intervalo usa o peso vigente na data da partida', () => {
    const chuvosas = [p('2026-09-20', true), p('2026-10-04', true)];
    expect(conta('2026-09-20', chuvosas, '2026-10-20', 0)).toBe(1 + 2);
  });

  it('aceita o resolvedor de pesos já pronto', () => {
    const resolvedor = criarResolvedorDePesos([antiga, nova]);
    expect(
      acumuladoPorInicio({
        inicio: '2026-09-27',
        pontuacaoInicial: 0,
        presencas: vandre,
        configs: resolvedor,
        referencia: '2026-10-20',
      }),
    ).toBe(2);
  });
});

describe('rodadasDoJogador com data de início', () => {
  const periodos = [{ inicio: '2026-09-01', fim: null }];
  const partidas = ['2026-09-20', '2026-09-27', '2026-10-04'].map((data) => ({ id: data, data, choveu: false }));
  const situacoes = new Map<string, 'presente'>([['2026-09-20', 'presente']]);
  const resolvedor = criarResolvedorDePesos([antiga]);

  it('rodada anterior ao início é fora, sem pontos nem falta', () => {
    expect(rodadasDoJogador(periodos, partidas, situacoes, resolvedor, '2026-09-27')).toEqual([
      { situacao: 'fora', pontos: null },
      { situacao: 'falta', pontos: 0 },
      { situacao: 'falta', pontos: 0 },
    ]);
  });

  it('presença gravada fora de período conta; sem presença segue fora; antes do início segue fora', () => {
    const fechado = [{ inicio: '2026-09-01', fim: '2026-09-25' }];
    const gravadas = new Map<string, 'presente'>([
      ['2026-09-20', 'presente'],
      ['2026-09-27', 'presente'],
    ]);
    expect(rodadasDoJogador(fechado, partidas, gravadas, resolvedor)).toEqual([
      { situacao: 'presente', pontos: 1 },
      { situacao: 'presente', pontos: 1 },
      { situacao: 'fora', pontos: null },
    ]);
    expect(rodadasDoJogador(fechado, partidas, gravadas, resolvedor, '2026-09-27')[0]).toEqual({
      situacao: 'fora',
      pontos: null,
    });
  });

  it('sem data de início mantém o comportamento pelos períodos', () => {
    expect(rodadasDoJogador(periodos, partidas, situacoes, resolvedor)[0]).toEqual({ situacao: 'presente', pontos: 1 });
  });
});

describe('inicioEfetivo', () => {
  const periodos = [{ inicio: '2026-03-01' }, { inicio: '2026-08-01' }];

  it('a data gravada vence', () => {
    expect(inicioEfetivo({ inicioPontuacao: '2026-05-10', periodos })).toBe('2026-05-10');
  });

  it('sem data gravada, vale o início do primeiro período', () => {
    expect(inicioEfetivo({ inicioPontuacao: null, periodos })).toBe('2026-03-01');
    expect(inicioEfetivo({ periodos })).toBe('2026-03-01');
  });

  it('sem data gravada e sem período, não há início', () => {
    expect(inicioEfetivo({ inicioPontuacao: undefined, periodos: [] })).toBeUndefined();
  });
});

describe('acumuladoPorInicio com períodos (saiu e voltou)', () => {
  // Kim: 1º período 2022-07-03 a 2023-08-28 (21 presenças de 1 ponto no período) e retorno em 2026-10-04 com 2 presenças.
  const periodos = [
    { inicio: '2022-07-03', fim: '2023-08-28' },
    { inicio: '2026-10-04', fim: null },
  ];
  const antigas = Array.from({ length: 21 }, (_, i) =>
    p(`2022-${String(7 + Math.floor(i / 4)).padStart(2, '0')}-${String(3 + (i % 4) * 7).padStart(2, '0')}`),
  );
  const kim = [...antigas, p('2026-10-04'), p('2026-10-11')];
  const conta2 = (referencia: string, periodoEm?: string) =>
    acumuladoPorInicio({
      inicio: '2022-07-03',
      pontuacaoInicial: 0,
      presencas: kim,
      configs: [antiga, nova],
      referencia,
      periodos,
      ...(periodoEm ? { periodoEm } : {}),
    });

  it('hoje, depois do retorno, conta só o período atual', () => {
    expect(conta2('2026-10-22')).toBe(2);
  });

  it('o PTS INICIAL do mês do retorno é 0 (período do mês, soma até a véspera)', () => {
    expect(conta2('2026-09-30', '2026-10-31')).toBe(0);
  });

  it('mês do 1º período não muda: segue a data de início', () => {
    expect(conta2('2023-02-28')).toBe(antigas.filter((x) => x.data <= '2023-02-28').length);
    expect(conta2('2023-08-28')).toBe(21);
  });

  it('quem nunca saiu não muda', () => {
    const um = [{ inicio: '2022-07-03', fim: null }];
    const r = acumuladoPorInicio({
      inicio: '2022-07-03',
      pontuacaoInicial: 0,
      presencas: kim,
      configs: [antiga, nova],
      referencia: '2026-10-22',
      periodos: um,
    });
    expect(r).toBe(23);
  });
});
