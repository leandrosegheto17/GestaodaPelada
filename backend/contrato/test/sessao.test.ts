import { describe, expect, it } from 'vitest';
import {
  avisoPrivacidadeCorpo,
  entrarCorpo,
  erroBloqueado,
  erroNaoAutenticado,
  erroPadrao,
  esqueciSenhaCorpo,
  esqueciSenhaResposta,
  sessaoEu,
  trocarSenhaCorpo,
} from '../src/index.js';
import { respostas } from './apoio/respostas.js';

describe('respostas do mockup', () => {
  it.each(respostas(/^sessao-eu-.*\.json$/))('$nome passa em sessaoEu', ({ json }) => {
    expect(sessaoEu.safeParse(json).success).toBe(true);
  });
  it('esqueci-senha.json', () => {
    expect(esqueciSenhaResposta.safeParse(respostas(/^esqueci-senha\.json$/)[0]?.json).success).toBe(true);
  });
  it('401 e 429', () => {
    expect(erroNaoAutenticado.safeParse(respostas(/^erro-nao-autenticado\.json$/)[0]?.json).success).toBe(true);
    expect(erroNaoAutenticado.safeParse(respostas(/^sessao-entrar-erro\.json$/)[0]?.json).success).toBe(true);
    expect(erroBloqueado.safeParse(respostas(/^sessao-entrar-bloqueado\.json$/)[0]?.json).success).toBe(true);
  });
  it.each(respostas(/^erro-validacao-(nova-senha|senha-atual)\.json$/))('$nome é erro de validação', ({ json }) => {
    expect(erroPadrao.safeParse(json).success).toBe(true);
  });
  it('enderecoNovo aceita ausente, null e URL; recusa texto solto', () => {
    const base = respostas(/^sessao-eu-admin\.json$/)[0]?.json as Record<string, unknown>;
    const semEndereco = Object.fromEntries(Object.entries(base).filter(([chave]) => chave !== 'enderecoNovo'));
    expect(sessaoEu.safeParse(semEndereco).success).toBe(true);
    expect(sessaoEu.safeParse({ ...base, enderecoNovo: null }).success).toBe(true);
    expect(sessaoEu.safeParse({ ...base, enderecoNovo: 'https://exemplo.com' }).success).toBe(true);
    expect(sessaoEu.safeParse({ ...base, enderecoNovo: 'lixo' }).success).toBe(false);
  });
});

describe('trocarSenhaCorpo', () => {
  const corpo = (nova: string, confirmacao = nova) => ({ novaSenha: nova, confirmacao });
  it.each([
    ['a'.repeat(7), false],
    ['a'.repeat(8), true],
    ['a'.repeat(72), true],
    ['a'.repeat(73), false],
    ['ç'.repeat(72), false],
    ['ç'.repeat(36), true],
    ['😀'.repeat(8), true],
    ['😀'.repeat(19), false],
  ])('nova senha de %#', (nova, ok) => {
    expect(trocarSenhaCorpo.safeParse(corpo(nova)).success).toBe(ok);
  });
  it('confirmação divergente falha no campo confirmacao', () => {
    const r = trocarSenhaCorpo.safeParse(corpo('12345678', '12345679'));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['confirmacao']);
  });
  it('senhaAtual é opcional e campo extra é recusado', () => {
    expect(trocarSenhaCorpo.safeParse({ ...corpo('12345678'), senhaAtual: 'x' }).success).toBe(true);
    expect(trocarSenhaCorpo.safeParse({ ...corpo('12345678'), eDono: true }).success).toBe(false);
  });
  it('a mensagem de erro não ecoa a senha', () => {
    const r = trocarSenhaCorpo.safeParse(corpo('segredo'));
    expect(JSON.stringify(r.error?.issues)).not.toContain('segredo');
  });
});

describe('entrarCorpo e esqueciSenhaCorpo', () => {
  it('normaliza o e-mail e recusa extras', () => {
    expect(entrarCorpo.parse({ email: ' Ana@Exemplo.com ', senha: 'x' }).email).toBe('ana@exemplo.com');
    expect(entrarCorpo.safeParse({ email: 'a@b.com', senha: 'x', outro: 1 }).success).toBe(false);
  });
  it('e-mail de 254 aceito e 255 recusado; sem @ recusado', () => {
    const com = (n: number) =>
      `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(n - 64 - 1 - 63 - 1 - 63 - 1)}`;
    expect(com(254)).toHaveLength(254);
    expect(esqueciSenhaCorpo.safeParse({ email: com(254) }).success).toBe(true);
    expect(esqueciSenhaCorpo.safeParse({ email: com(255) }).success).toBe(false);
    expect(esqueciSenhaCorpo.safeParse({ email: 'sem-arroba' }).success).toBe(false);
  });
  it('senha vazia ou acima de 72 bytes é recusada no login', () => {
    expect(entrarCorpo.safeParse({ email: 'a@b.com', senha: '' }).success).toBe(false);
    expect(entrarCorpo.safeParse({ email: 'a@b.com', senha: 'ç'.repeat(40) }).success).toBe(false);
  });
});

describe('avisoPrivacidadeCorpo', () => {
  it('aceita só o corpo vazio', () => {
    expect(avisoPrivacidadeCorpo.safeParse({}).success).toBe(true);
    expect(avisoPrivacidadeCorpo.safeParse({ contaId: 'x' }).success).toBe(false);
    expect(avisoPrivacidadeCorpo.safeParse({ visto: true }).success).toBe(false);
  });
});
