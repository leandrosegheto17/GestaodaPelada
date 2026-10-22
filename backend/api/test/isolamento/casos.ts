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
  'POST /api/sessao/aviso-privacidade': {
    tipo: 'nao_se_aplica',
    justificativa: 'Grava só na conta da própria sessão, sem grupo.',
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
  'PATCH /api/grupos/:grupoId': {
    tipo: 'grupo',
    corpo: { nome: 'Grupo Editado', diaSemana: 'quinta', frequencia: 'semanal', horario: '20:00' },
  },
  'GET /api/grupos/:grupoId/admins': { tipo: 'grupo' },
  'POST /api/grupos/:grupoId/admins': {
    tipo: 'grupo',
    corpo: { nome: 'Novo Admin', email: 'novo-admin@teste.invalid' },
  },
  'DELETE /api/grupos/:grupoId/admins/:contaId': { tipo: 'grupo' },
  'POST /api/grupos/:grupoId/admins/:contaId/redefinir-senha': { tipo: 'grupo' },
  'PATCH /api/grupos/:grupoId/admins/:contaId/financeiro': { tipo: 'financeiro', corpo: { acessaFinanceiro: true } },
  'GET /api/grupos/:grupoId/jogadores': { tipo: 'grupo' },
  'GET /api/grupos/:grupoId/jogadores/:id': { tipo: 'grupo' },
  'GET /api/grupos/:grupoId/jogadores/:id/periodos': { tipo: 'grupo' },
  'POST /api/grupos/:grupoId/jogadores/:id/periodos/:periodoId/previa': {
    tipo: 'grupo',
    corpo: { saida: '2020-01-01' },
  },
  'POST /api/grupos/:grupoId/jogadores/:id/reativar/previa': { tipo: 'grupo', corpo: { dataRetorno: '2020-01-01' } },
  'PUT /api/grupos/:grupoId/jogadores/:id/periodos/:periodoId': { tipo: 'grupo', corpo: { saida: '2020-01-01' } },
  'POST /api/grupos/:grupoId/jogadores': {
    tipo: 'grupo',
    corpo: { apelido: 'Isolamento', anoNascimento: 1990, posicao: 'atacante' },
  },
  'PATCH /api/grupos/:grupoId/jogadores/:id': {
    tipo: 'grupo',
    corpo: { apelido: 'Isolamento', anoNascimento: 1990, posicao: 'atacante' },
  },
  'POST /api/grupos/:grupoId/jogadores/:id/inicio/previa': { tipo: 'grupo', corpo: { data: '2020-01-01' } },
  'PUT /api/grupos/:grupoId/jogadores/:id/inicio': { tipo: 'grupo', corpo: { data: '2020-01-01' } },
  'POST /api/grupos/:grupoId/jogadores/:id/inativar': { tipo: 'grupo', corpo: {} },
  'POST /api/grupos/:grupoId/jogadores/:id/reativar': { tipo: 'grupo', corpo: { dataRetorno: '2020-01-01' } },
  'DELETE /api/grupos/:grupoId/jogadores/:id': { tipo: 'grupo' },
  'GET /api/grupos/:grupoId/pesos': { tipo: 'grupo' },
  'POST /api/grupos/:grupoId/pesos': {
    tipo: 'grupo',
    corpo: {
      presencaSemChuva: 1,
      presencaComChuva: 1,
      lesionadoSemChuva: 1,
      lesionadoComChuva: 1,
      expulsoSemChuva: -1,
      expulsoComChuva: -1,
    },
  },
  'GET /api/grupos/:grupoId/partidas': { tipo: 'grupo' },
  'GET /api/grupos/:grupoId/partidas/nova': { tipo: 'grupo' },
  'GET /api/grupos/:grupoId/partidas/:data{[0-9-]+}': { tipo: 'grupo', parametros: () => ({ data: '2026-10-15' }) },
  'POST /api/grupos/:grupoId/partidas': { tipo: 'grupo', corpo: { data: '2026-10-15', choveu: false, marcacoes: [] } },
  'PUT /api/grupos/:grupoId/partidas/:data{[0-9-]+}': {
    tipo: 'grupo',
    parametros: () => ({ data: '2026-10-15' }),
    corpo: { data: '2026-10-15', choveu: false, marcacoes: [] },
  },
  'DELETE /api/grupos/:grupoId/partidas/:data{[0-9-]+}': { tipo: 'grupo', parametros: () => ({ data: '2026-10-15' }) },
  'GET /api/publico/:slug/ranking': {
    tipo: 'nao_se_aplica',
    justificativa: 'Pública por slug: só a projeção estrita do ranking (RF-33).',
  },
  'GET /api/publico/:slug/pdf': {
    tipo: 'nao_se_aplica',
    justificativa: 'Pública por slug: só a projeção estrita do PDF (RF-33).',
  },
  'POST /api/publico/:slug/eventos': {
    tipo: 'nao_se_aplica',
    justificativa: 'Pública por slug: grava só evento anônimo do próprio grupo do slug.',
  },
  'GET /api/grupos/:grupoId/uso': { tipo: 'grupo' },
  'GET /api/grupos/:grupoId/habilidades': { tipo: 'grupo' },
  'POST /api/grupos/:grupoId/habilidades': { tipo: 'grupo', corpo: { nome: 'Cabeceio' } },
  'PATCH /api/grupos/:grupoId/habilidades/:id': { tipo: 'grupo', corpo: { nome: 'Cabeceio' } },
  'DELETE /api/grupos/:grupoId/habilidades/:id': { tipo: 'grupo' },
  'GET /api/grupos/:grupoId/simulador/contexto': { tipo: 'grupo' },
  'POST /api/grupos/:grupoId/simulador/previa': {
    tipo: 'grupo',
    corpo: {
      formato: 'dois_times',
      n: 7,
      k: 2,
      aptos: [{ id: '00000000-0000-4000-8000-000000000001', so1oTempo: false }],
    },
  },
  'POST /api/grupos/:grupoId/simulador/sugerir': {
    tipo: 'grupo',
    corpo: {
      formato: 'dois_times',
      data: '2026-10-22',
      n: 2,
      k: 0,
      aptos: [1, 2, 3, 4].map((i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, so1oTempo: false })),
    },
  },
  'POST /api/grupos/:grupoId/simulador/avaliar': {
    tipo: 'grupo',
    corpo: {
      formato: 'varios_times',
      data: '2026-10-22',
      n: 2,
      aptos: [{ id: '00000000-0000-4000-8000-000000000001' }],
      composicao: { times: [{ jogadores: ['00000000-0000-4000-8000-000000000001'] }] },
    },
  },
  'POST /api/grupos/:grupoId/escalacoes': {
    tipo: 'grupo',
    corpo: {
      formato: 'varios_times',
      data: '2026-10-22',
      n: 2,
      composicao: { times: [{ jogadores: ['00000000-0000-4000-8000-000000000001'] }] },
    },
  },
  'GET /api/grupos/:grupoId/financeiro/mes': { tipo: 'financeiro' },
  'POST /api/grupos/:grupoId/financeiro/pagamentos': {
    tipo: 'financeiro',
    corpo: { jogadorId: '00000000-0000-4000-8000-000000000001', mes: '2026-10' },
  },
  'DELETE /api/grupos/:grupoId/financeiro/pagamentos/:jogadorId/:mes': {
    tipo: 'financeiro',
    parametros: () => ({ mes: '2026-10' }),
  },
  'POST /api/grupos/:grupoId/financeiro/lancamentos': {
    tipo: 'financeiro',
    corpo: { tipo: 'saida', data: '2026-10-05', descricao: 'Bolas novas', valorCentavos: 10000 },
  },
  'GET /api/grupos/:grupoId/financeiro/lancamentos/:id': { tipo: 'financeiro' },
  'PUT /api/grupos/:grupoId/financeiro/lancamentos/:id': {
    tipo: 'financeiro',
    corpo: { tipo: 'saida', data: '2026-10-05', descricao: 'Bolas novas', valorCentavos: 10000 },
  },
  'DELETE /api/grupos/:grupoId/financeiro/lancamentos/:id': { tipo: 'financeiro' },
  'PUT /api/grupos/:grupoId/financeiro/config': {
    tipo: 'financeiro',
    corpo: { mensalidadeCentavos: 7500, saldoInicialCentavos: 35000, dataSaldoInicial: '2026-02-05' },
  },
  'PUT /api/grupos/:grupoId/jogadores/:id/notas/:habilidadeId': {
    tipo: 'grupo',
    parametros: () => ({ habilidadeId: '00000000-0000-4000-8000-0000000000aa' }),
    corpo: { nota: 5 },
  },
};
