import type { CampoPeriodo, RegraPeriodo, ResultadoAvaliacao } from '@pelada/dominio';
import { describe, expect, it } from 'vitest';
import {
  formatarDataBr,
  mensagemDaRecusa,
  mensagemInicioDepoisDaSaida,
} from '../../../src/aplicacao/elenco/mensagens-periodos.js';

type Recusa = Extract<ResultadoAvaliacao, { ok: false }>;

const r = (regra: RegraPeriodo, campo: CampoPeriodo, limite: string | null, presenca?: string): Recusa =>
  presenca === undefined ? { ok: false, regra, campo, limite } : { ok: false, regra, campo, limite, presenca };

const TABELA: Array<[string, Recusa, { campo: string; mensagem: string }]> = [
  ['a saida', r('a', 'saida', '2026-10-21'), { campo: 'saida', mensagem: 'A data não pode ser no futuro.' }],
  ['a retorno', r('a', 'retorno', '2026-10-21'), { campo: 'retorno', mensagem: 'A data não pode ser no futuro.' }],
  [
    'b',
    r('b', 'saida', '2026-01-05'),
    { campo: 'saida', mensagem: 'A saída não pode ser antes do início deste período (05/01/2026).' },
  ],
  [
    'c retorno',
    r('c', 'retorno', '2026-03-10'),
    { campo: 'retorno', mensagem: 'O retorno não pode ser antes da saída anterior (10/03/2026).' },
  ],
  [
    'c dataRetorno',
    r('c', 'dataRetorno', '2026-03-10'),
    { campo: 'dataRetorno', mensagem: 'O retorno não pode ser antes da saída anterior (10/03/2026).' },
  ],
  [
    'd saida',
    r('d', 'saida', '2026-04-02'),
    { campo: 'saida', mensagem: 'A saída não pode ser depois do próximo retorno (02/04/2026).' },
  ],
  [
    'd retorno',
    r('d', 'retorno', '2026-04-02'),
    { campo: 'retorno', mensagem: 'O retorno não pode ser depois da saída deste período (02/04/2026).' },
  ],
  ['e saida', r('e', 'saida', null), { campo: 'saida', mensagem: 'Os períodos não podem se sobrepor.' }],
  ['e retorno', r('e', 'retorno', null), { campo: 'retorno', mensagem: 'Os períodos não podem se sobrepor.' }],
  [
    'f saida',
    r('f', 'saida', '2026-10-13', '2026-10-12'),
    {
      campo: 'saida',
      mensagem:
        'Há presença do jogador em 12/10/2026. A saída precisa ser em 13/10/2026 ou depois. Para usar uma data anterior, remova a presença em Editar partida.',
    },
  ],
  [
    'f retorno',
    r('f', 'retorno', '2026-10-12', '2026-10-13'),
    {
      campo: 'retorno',
      mensagem:
        'Há presença do jogador em 13/10/2026. O retorno precisa ser em 12/10/2026 ou antes. Para usar uma data posterior, remova a presença em Editar partida.',
    },
  ],
  [
    'g',
    r('g', 'saida', '2026-02-01'),
    {
      campo: 'saida',
      mensagem:
        'A saída do primeiro período não pode ser antes da data de início da pontuação (01/02/2026). Para ir antes, altere primeiro a data de início.',
    },
  ],
  ['h saida', r('h', 'saida', null), { campo: 'saida', mensagem: 'Informe uma data válida.' }],
  ['h retorno', r('h', 'retorno', null), { campo: 'retorno', mensagem: 'Informe uma data válida.' }],
  [
    'nao corrigivel saida',
    r('nao-corrigivel', 'saida', null),
    { campo: 'saida', mensagem: 'Este período não tem data de saída.' },
  ],
  [
    'nao corrigivel retorno',
    r('nao-corrigivel', 'retorno', null),
    {
      campo: 'retorno',
      mensagem: 'O início do primeiro período é a data de início da pontuação; use Alterar data de início.',
    },
  ],
];

describe('mensagemDaRecusa', () => {
  it.each(TABELA)('%s devolve o texto literal da tabela', (_nome, recusa, esperado) => {
    expect(mensagemDaRecusa(recusa)).toEqual(esperado);
  });

  it('devolve texto não vazio para toda regra do domínio', () => {
    const regras: Record<RegraPeriodo, true> = {
      a: true,
      b: true,
      c: true,
      d: true,
      e: true,
      f: true,
      g: true,
      h: true,
      'nao-corrigivel': true,
    };
    for (const regra of Object.keys(regras) as RegraPeriodo[]) {
      for (const campo of ['saida', 'retorno', 'dataRetorno'] as CampoPeriodo[]) {
        const { mensagem } = mensagemDaRecusa(r(regra, campo, '2026-01-05', '2026-01-04'));
        expect(mensagem.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('mensagemInicioDepoisDaSaida', () => {
  it('cita a data limite e a correção da saída', () => {
    expect(mensagemInicioDepoisDaSaida('2026-10-05')).toBe(
      'A data de início não pode ficar depois da saída do primeiro período (05/10/2026). Corrija antes a data de saída do primeiro período.',
    );
  });
});

describe('formatarDataBr', () => {
  it('converte aaaa-mm-dd em dd/mm/aaaa', () => {
    expect(formatarDataBr('2026-01-05')).toBe('05/01/2026');
  });

  it('lança para entrada fora do formato', () => {
    expect(() => formatarDataBr('05/01/2026')).toThrow();
    expect(() => formatarDataBr('')).toThrow();
  });
});
