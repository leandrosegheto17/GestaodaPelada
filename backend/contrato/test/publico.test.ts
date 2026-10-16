import { describe, expect, it } from 'vitest';
import { eventoPublicoCorpo, rankingPublico } from '../src/index.js';
import { respostas } from './apoio/respostas.js';

describe('respostas do mockup', () => {
  it.each(respostas(/^publico-ranking-.*\.json$/))('$nome passa em rankingPublico', ({ json }) => {
    expect(rankingPublico.safeParse(json).success).toBe(true);
  });
});

describe('campos proibidos (G-10)', () => {
  const base = respostas(/^publico-ranking-2026-10\.json$/)[0]?.json as {
    grupo: object;
    linhas: object[];
  };
  const proibidos = {
    telefone: '(11) 91234-5678',
    anoNascimento: 1990,
    idade: 36,
    posicaoEmCampo: 'atacante',
    notas: [8],
    nivel: 6.8,
    saldoCentavos: 100,
    valorCentavos: 100,
    financeiro: {},
    email: 'a@b.com',
    id: 'g-1',
  };
  it.each(Object.entries(proibidos))('%s é recusado na raiz, no grupo e na linha', (campo, valor) => {
    const comCampo = (alvo: object) => ({ ...alvo, [campo]: valor });
    expect(rankingPublico.safeParse(comCampo(base)).success).toBe(false);
    expect(rankingPublico.safeParse({ ...base, grupo: comCampo(base.grupo) }).success).toBe(false);
    expect(rankingPublico.safeParse({ ...base, linhas: [comCampo(base.linhas[0] as object)] }).success).toBe(false);
  });
  it('posição em campo (texto) no lugar da colocação é recusada', () => {
    const linha = { ...(base.linhas[0] as object), posicao: 'atacante' };
    expect(rankingPublico.safeParse({ ...base, linhas: [linha] }).success).toBe(false);
  });
});

describe('eventos públicos', () => {
  const uuid = '123e4567-e89b-12d3-a456-426614174000';
  it('aceita os dois tipos válidos', () => {
    expect(eventoPublicoCorpo.safeParse({ tipo: 'ranking_aberto', dispositivoId: uuid }).success).toBe(true);
    expect(eventoPublicoCorpo.safeParse({ tipo: 'pdf_exportado', mes: '2026-10' }).success).toBe(true);
  });
  it.each([
    { tipo: 'ranking_aberto', dispositivoId: 'lixo' },
    { tipo: 'ranking_aberto', dispositivoId: '' },
    { tipo: 'ranking_aberto' },
    { tipo: 'pdf_exportado', mes: '2026-13' },
    { tipo: 'pdf_exportado', mes: '26-10' },
    { tipo: 'pagina_vista' },
    { tipo: 'ranking_aberto', dispositivoId: uuid, ip: '1.2.3.4' },
    { tipo: 'ranking_aberto', dispositivoId: uuid, userAgent: 'x' },
    { tipo: 'pdf_exportado', mes: '2026-10', nome: 'Ana' },
  ])('recusa %j', (corpo) => {
    expect(eventoPublicoCorpo.safeParse(corpo).success).toBe(false);
  });
});
