import { CODIGOS_ERRO } from '@pelada/contrato';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../app.js';
import { corpoErro } from '../erros.js';

/** Contrato mínimo do binding de Rate Limiting do Workers. */
export interface Limitador {
  limit(opcoes: { key: string }): Promise<{ success: boolean }>;
}

/** Quando a requisição não traz o IP (fora da Cloudflare), todos dividem a mesma chave: falha fechada. */
const CHAVE_SEM_IP = 'sem-ip';

/**
 * Limite de taxa por IP. O IP só serve de chave do limitador: não é guardado, logado nem devolvido.
 * Sem o binding (ambiente local) não limita; se o próprio limitador falha, deixa passar e
 * registra só que ele estava indisponível.
 */
export function criarLimiteTaxa(
  obter: (c: Parameters<MiddlewareHandler<AppEnv>>[0]) => Limitador | undefined,
): MiddlewareHandler<AppEnv> {
  return async (c, proximo) => {
    const limitador = obter(c);
    if (limitador) {
      try {
        const { success } = await limitador.limit({ key: c.req.header('CF-Connecting-IP') ?? CHAVE_SEM_IP });
        if (!success) {
          return c.json(
            corpoErro(CODIGOS_ERRO.muitasRequisicoes, 'Muitas requisições. Tente de novo em instantes.'),
            429,
          );
        }
      } catch {
        console.error('limitador indisponível');
      }
    }
    return proximo();
  };
}
