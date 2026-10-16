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
  'GET /api/sessao/eu': {
    tipo: 'nao_se_aplica',
    justificativa: 'Lê só a conta da própria sessão; os grupos vêm dos vínculos dela.',
  },
  'POST /api/sessao/sair': {
    tipo: 'nao_se_aplica',
    justificativa: 'Encerra só a sessão do próprio cookie, sem dado de grupo.',
  },
  'POST /api/sessao/esqueci-senha': {
    tipo: 'nao_se_aplica',
    justificativa: 'Rota de sessão sem dado de grupo: só registra o pedido da própria conta.',
  },
  'POST /api/sessao/trocar-senha': {
    tipo: 'nao_se_aplica',
    justificativa: 'Rota de sessão: troca só a senha da própria conta, sem dado de grupo.',
  },
  'GET /api/dono/painel': { tipo: 'dono' },
  'GET /api/dono/grupos/:id': { tipo: 'dono' },
  'POST /api/dono/grupos': {
    tipo: 'dono',
    corpo: {
      nome: 'Grupo do Teste',
      diaSemana: 'quinta',
      frequencia: 'semanal',
      horario: '20:00',
      adminNome: 'Admin Teste',
      adminEmail: 'admin-isolamento@teste.invalid',
    },
  },
  'PATCH /api/dono/grupos/:id/situacao': { tipo: 'dono', corpo: { situacaoComercial: 'ativo', inicioTrial: null } },
  'POST /api/dono/grupos/:id/arquivar': { tipo: 'dono', corpo: { nomeConfirmacao: 'x' } },
  'POST /api/dono/grupos/:id/reativar': { tipo: 'dono' },
  'POST /api/dono/pedidos-reset/:id/resolver': { tipo: 'dono' },
  'POST /api/dono/contas/:id/redefinir-senha': { tipo: 'dono' },
  'GET /api/grupos/:grupoId': { tipo: 'grupo' },
};
