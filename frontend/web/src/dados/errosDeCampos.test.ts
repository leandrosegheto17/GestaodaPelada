import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { erroPadrao, trocarSenhaCorpo } from '@pelada/contrato';
import { describe, expect, it } from 'vitest';
import { deErroApi, deValidacao } from './errosDeCampos';
import { ErroApi, ErroRede } from './erros';

const RESPOSTAS = join(import.meta.dirname, '../../../../.md/mockup/respostas');
const erroDe = (arquivo: string, status = 422) =>
  new ErroApi(status, erroPadrao.parse(JSON.parse(readFileSync(join(RESPOSTAS, arquivo), 'utf8'))));

describe('deErroApi', () => {
  it('devolve os campos do 422', () => {
    expect(deErroApi(erroDe('erro-validacao-nova-senha.json'))).toEqual({
      novaSenha: 'A nova senha precisa ser diferente da temporária.',
      confirmacao: 'As senhas não conferem.',
    });
  });

  it('sem campos ou de outro tipo devolve null', () => {
    expect(deErroApi(erroDe('erro-nao-autenticado.json', 401))).toBeNull();
    expect(deErroApi(new ErroRede(new Error('x')))).toBeNull();
    expect(deErroApi('texto')).toBeNull();
  });
});

describe('deValidacao', () => {
  it('mensagens do contrato nas chaves certas', () => {
    expect(deValidacao(trocarSenhaCorpo.safeParse({ novaSenha: '1234567', confirmacao: '1234567' }))).toEqual({
      novaSenha: 'A senha precisa ter de 8 a 72 caracteres.',
    });
    expect(deValidacao(trocarSenhaCorpo.safeParse({ novaSenha: '12345678', confirmacao: 'outra-coisa' }))).toEqual({
      confirmacao: 'As senhas não conferem.',
    });
  });

  it('sucesso devolve vazio', () => {
    expect(deValidacao(trocarSenhaCorpo.safeParse({ novaSenha: '12345678', confirmacao: '12345678' }))).toEqual({});
  });
});
