import { describe, expect, it } from 'vitest';
import {
  erroPadrao,
  jogadorDetalhe,
  periodoCorrigirCorpo,
  periodoCorrigirResposta,
  periodoPreviaResposta,
  periodosResposta,
  reativarCorpo,
  reativarCorpoComHoje,
  reativarPreviaCorpo,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

const lista = respostas(/^jogador-.*-periodos\.json$/);

describe('respostas do mockup', () => {
  it('encontra os 7 arquivos de períodos', () => {
    expect(lista).toHaveLength(7);
  });
  it.each(lista)('$nome passa em periodosResposta', ({ json }) => {
    expect(periodosResposta.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^(periodo-previa-.*|reativar-previa-.*)\.json$/))(
    '$nome passa em periodoPreviaResposta',
    ({ json }) => {
      expect(periodoPreviaResposta.safeParse(json).success).toBe(true);
    },
  );
  it.each(respostas(/^periodo-editar-resposta\.json$/))('$nome passa em periodoCorrigirResposta', ({ json }) => {
    expect(periodoCorrigirResposta.safeParse(json).success).toBe(true);
  });
  it.each(respostas(/^(erro-periodo-presenca|erro-reativar-antes-da-saida|erro-inicio-depois-da-saida)\.json$/))(
    '$nome passa no erro com campos',
    ({ json }) => {
      const r = erroPadrao.safeParse(json);
      expect(r.success).toBe(true);
      expect(Object.keys((json as { erro: { campos: object } }).erro.campos).length).toBeGreaterThan(0);
    },
  );
});

describe('respostas inválidas', () => {
  const periodo = lista[0]?.json as { periodos: Record<string, unknown>[] };
  const primeiro = periodo.periodos[0] as Record<string, unknown>;
  const com = (parte: Record<string, unknown>) => ({ periodos: [{ ...primeiro, ...parte }] });

  it('recusa id vazio, tipo fora do enum, data inexistente e campo extra', () => {
    expect(periodosResposta.safeParse(com({ id: '' })).success).toBe(false);
    expect(periodosResposta.safeParse(com({ tipo: 'saida' })).success).toBe(false);
    expect(periodosResposta.safeParse(com({ inicio: '2026-02-30' })).success).toBe(false);
    expect(periodosResposta.safeParse(com({ extra: 1 })).success).toBe(false);
  });
  it('a prévia recusa campo extra e aviso ausente', () => {
    const previa = respostas(/^periodo-previa-saida\.json$/)[0]?.json as Record<string, unknown>;
    expect(periodoPreviaResposta.safeParse({ ...previa, extra: 1 }).success).toBe(false);
    const sem = { ...previa };
    delete sem['aviso'];
    expect(periodoPreviaResposta.safeParse(sem).success).toBe(false);
  });
});

describe('periodoCorrigirCorpo', () => {
  it('aceita saída, retorno ou os dois', () => {
    expect(periodoCorrigirCorpo.safeParse({ saida: '2026-10-05' }).success).toBe(true);
    expect(periodoCorrigirCorpo.safeParse({ retorno: '2026-10-12' }).success).toBe(true);
    expect(periodoCorrigirCorpo.safeParse({ saida: '2026-10-05', retorno: '2026-10-12' }).success).toBe(true);
  });
  it('recusa vazio, campo extra, data inexistente e não-string', () => {
    expect(periodoCorrigirCorpo.safeParse({}).success).toBe(false);
    expect(periodoCorrigirCorpo.safeParse({ saida: '2026-10-05', extra: 1 }).success).toBe(false);
    expect(periodoCorrigirCorpo.safeParse({ saida: '2026-02-30' }).success).toBe(false);
    expect(periodoCorrigirCorpo.safeParse({ retorno: 20261012 }).success).toBe(false);
  });
});

describe('reativar', () => {
  it('reativarCorpo aceita {} e { dataRetorno } e recusa tipo errado, data inexistente e extra', () => {
    expect(reativarCorpo.safeParse({}).success).toBe(true);
    expect(reativarCorpo.safeParse({ dataRetorno: '2026-10-12' }).success).toBe(true);
    expect(reativarCorpo.safeParse({ dataRetorno: 5 }).success).toBe(false);
    expect(reativarCorpo.safeParse({ dataRetorno: '2026-02-30' }).success).toBe(false);
    expect(reativarCorpo.safeParse({ eDono: true }).success).toBe(false);
  });
  it('a fábrica com hoje recusa data futura', () => {
    const corpo = reativarCorpoComHoje('2026-10-22');
    expect(corpo.safeParse({ dataRetorno: '2026-10-22' }).success).toBe(true);
    expect(corpo.safeParse({ dataRetorno: '2026-10-23' }).success).toBe(false);
    expect(corpo.safeParse({}).success).toBe(true);
  });
  it('o corpo da prévia exige dataRetorno', () => {
    expect(reativarPreviaCorpo.safeParse({ dataRetorno: '2026-10-12' }).success).toBe(true);
    expect(reativarPreviaCorpo.safeParse({}).success).toBe(false);
    expect(reativarPreviaCorpo.safeParse({ dataRetorno: '2026-10-12', x: 1 }).success).toBe(false);
  });
});

describe('elenco.detalhe', () => {
  it('continua recusando campo desconhecido', () => {
    const detalhe = respostas(/^jogador-toninho\.json$/)[0]?.json as Record<string, unknown>;
    expect(jogadorDetalhe.safeParse(detalhe).success).toBe(true);
    expect(jogadorDetalhe.safeParse({ ...detalhe, periodos: [] }).success).toBe(false);
  });
});
