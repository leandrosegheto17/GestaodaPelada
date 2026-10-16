import type { Cenario } from '../apoio/cenario-acesso.js';

/**
 * Registro único dos casos da suíte de isolamento (G-03, G-04). Toda rota nova do Hono ganha
 * uma linha aqui, na mesma tarefa que a cria:
 * - `grupo`: dado de grupo (`/api/grupos/:grupoId/...`), 404 para quem não é admin do grupo;
 * - `financeiro`: igual, mais 403 para quem é admin do grupo mas não tem a permissão;
 * - `dono`: `/api/dono/...`, 404 para quem não é o dono;
 * - `nao_se_aplica`: rota sem dado de grupo, com a justificativa.
 */
export type Caso =
  | {
      tipo: 'grupo' | 'financeiro';
      /** Valores de parâmetros além de `:grupoId` (padrão: um uuid aleatório). */
      parametros?: (cenario: Cenario) => Record<string, string>;
      corpo?: unknown;
    }
  | { tipo: 'dono'; parametros?: (cenario: Cenario) => Record<string, string>; corpo?: unknown }
  | { tipo: 'nao_se_aplica'; justificativa: string };

export const CASOS: Record<string, Caso> = {
  'GET /api/saude': {
    tipo: 'nao_se_aplica',
    justificativa: 'Verificação de saúde: não lê dado de grupo nem de conta.',
  },
  'POST /api/sessao/entrar': { tipo: 'nao_se_aplica', justificativa: 'Rota de autenticação, sem dado de grupo.' },
};
