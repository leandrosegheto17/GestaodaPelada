import { painelDono, type PainelDono } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';
import * as pedidos from '../../infraestrutura/db/repositorios/pedidos-reset.js';
import * as vinculos from '../../infraestrutura/db/repositorios/vinculos.js';
import { paraMetadadosGrupo } from './metadados-grupo.js';

const porNome = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/**
 * Painel do dono: pedidos de "esqueci a senha" pendentes e os metadados de todos os grupos
 * (ativos primeiro, arquivados depois, cada bloco por nome). Nada de jogadores, partidas, notas
 * ou financeiro (RF-07).
 */
export async function montarPainel(ex: ExecutorDb, donoContaId: string): Promise<PainelDono> {
  const [pendentes, todos, grupoDoDono] = await Promise.all([
    pedidos.listarPendentes(ex),
    grupos.listarTodosComAdmins(ex),
    vinculos.gruposDaConta(ex, donoContaId),
  ]);
  const ordenados = [...todos].sort(
    (a, b) => Number(a.arquivadoEm !== null) - Number(b.arquivadoEm !== null) || porNome.compare(a.nome, b.nome),
  );
  return painelDono.parse({
    pedidosReset: pendentes.map((p) => ({
      contaId: p.contaId,
      email: p.email,
      grupos: p.grupos,
      ultimoPedidoEm: p.ultimoPedidoEm.toISOString(),
    })),
    grupos: ordenados.map((g) => ({ ...paraMetadadosGrupo(g), admins: g.admins })),
    dono: { tambemAdmin: grupoDoDono.length > 0 },
  });
}
