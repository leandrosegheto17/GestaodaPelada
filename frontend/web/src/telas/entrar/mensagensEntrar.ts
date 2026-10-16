import { ErroApi } from '../../dados/erros';

export type FalhaEntrar = { tipo: 'mensagem'; texto: string } | { tipo: 'conexao' };

export const TEXTO_CREDENCIAIS = 'E-mail ou senha incorretos.';
export const TEXTO_BLOQUEADO = 'Muitas tentativas. Tente de novo em 15 minutos.';

/**
 * Traduz o erro do envio em texto fixo. Nunca usa a mensagem da API: 401 e 422 dizem a mesma
 * coisa (não revelam se o e-mail existe).
 */
export function falhaDeEntrar(erro: unknown): FalhaEntrar {
  if (erro instanceof ErroApi) {
    if (erro.status === 429) return { tipo: 'mensagem', texto: TEXTO_BLOQUEADO };
    if (erro.status === 401 || erro.status === 422) return { tipo: 'mensagem', texto: TEXTO_CREDENCIAIS };
  }
  return { tipo: 'conexao' };
}
