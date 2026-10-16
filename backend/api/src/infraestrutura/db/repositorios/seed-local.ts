import { kyselyDe, type ExecutorDb } from '../cliente.js';

/**
 * Apaga tudo que pertence aos grupos (por slug) e às contas (por e-mail) do seed local, em ordem
 * de dependência. Só `backend/scripts/seed-local.ts` usa esta função (regra de lint).
 */
export async function apagarDadosDoSeed(
  ex: ExecutorDb,
  seed: { slugs: readonly string[]; emails: readonly string[] },
): Promise<void> {
  const banco = kyselyDe(ex);
  const grupos = await banco
    .selectFrom('grupos')
    .select('id')
    .where('slug', 'in', [...seed.slugs])
    .execute();
  const contas = await banco
    .selectFrom('contas')
    .select('id')
    .where('email', 'in', [...seed.emails])
    .execute();
  const grupoIds = grupos.map((g) => g.id);
  const contaIds = contas.map((c) => c.id);

  if (grupoIds.length > 0) {
    for (const tabela of [
      'eventos_uso',
      'presencas',
      'partidas',
      'config_pesos',
      'notas',
      'habilidades',
      'periodos_ativos',
      'jogadores',
      'auditoria',
      'vinculos_admin',
    ] as const) {
      await banco.deleteFrom(tabela).where('grupo_id', 'in', grupoIds).execute();
    }
    await banco.deleteFrom('grupos').where('id', 'in', grupoIds).execute();
  }
  if (contaIds.length > 0) {
    await banco.deleteFrom('sessoes').where('conta_id', 'in', contaIds).execute();
    await banco
      .deleteFrom('pedidos_reset')
      .where((eb) => eb.or([eb('conta_id', 'in', contaIds), eb('resolvido_por', 'in', contaIds)]))
      .execute();
    await banco.deleteFrom('auditoria').where('autor_conta_id', 'in', contaIds).execute();
    await banco
      .deleteFrom('vinculos_admin')
      .where((eb) => eb.or([eb('conta_id', 'in', contaIds), eb('criado_por', 'in', contaIds)]))
      .execute();
    await banco
      .deleteFrom('tentativas_login')
      .where('email', 'in', [...seed.emails])
      .execute();
    await banco.deleteFrom('contas').where('id', 'in', contaIds).execute();
  }
}
