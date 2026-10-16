import { CODIGOS_ERRO, type ErroPadrao, type ZodError } from '@pelada/contrato';
import type { Context } from 'hono';

export function corpoErro(
  codigo: string,
  mensagem: string,
  campos?: Record<string, string>,
): ErroPadrao {
  return { erro: { codigo, mensagem, ...(campos ? { campos } : {}) } };
}

export function naoEncontrado(c: Context): Response {
  return c.json(corpoErro(CODIGOS_ERRO.naoEncontrado, 'Recurso não encontrado.'), 404);
}

export function erroInterno(c: Context): Response {
  return c.json(corpoErro(CODIGOS_ERRO.erroInterno, 'Não foi possível concluir a operação.'), 500);
}

export function requisicaoRecusada(c: Context): Response {
  return c.json(corpoErro(CODIGOS_ERRO.requisicaoRecusada, 'Requisição recusada.'), 403);
}

export function corpoGrande(c: Context): Response {
  return c.json(corpoErro(CODIGOS_ERRO.corpoGrande, 'O corpo da requisição é grande demais.'), 413);
}

/** 422 com `campos`: uma mensagem por campo, sem ecoar o valor recebido. */
export function responderValidacao(c: Context, erro: ZodError): Response {
  const campos: Record<string, string> = {};
  for (const problema of erro.issues) {
    const chave = problema.path.join('.') || 'corpo';
    campos[chave] ??= problema.message;
  }
  return c.json(corpoErro(CODIGOS_ERRO.validacao, 'Corrija os campos indicados.', campos), 422);
}
