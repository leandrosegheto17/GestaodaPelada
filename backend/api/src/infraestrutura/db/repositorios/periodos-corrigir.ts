import { kyselyDe, type ExecutorDb } from '../cliente.js';
import { JaAtivo, PeriodoInvalido } from './jogadores.js';

export interface CorrecaoDePeriodo {
  inicio?: string;
  fim?: string;
}

/**
 * Corrige início e/ou fim de um período; só os campos informados mudam. O período precisa ser do
 * jogador e do grupo, senão `'nao_encontrado'`. Sem campo informado nada é gravado: devolve
 * `'ok'` se o período existe. Quem chama abre a transação.
 */
export async function corrigirPeriodo(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  periodoId: string,
  parcial: CorrecaoDePeriodo,
): Promise<'ok' | 'nao_encontrado'> {
  const banco = kyselyDe(ex);
  const campos: CorrecaoDePeriodo = {};
  if (parcial.inicio !== undefined) campos.inicio = parcial.inicio;
  if (parcial.fim !== undefined) campos.fim = parcial.fim;
  if (Object.keys(campos).length === 0) {
    const existe = await banco
      .selectFrom('periodos_ativos')
      .select('id')
      .where('id', '=', periodoId)
      .where('jogador_id', '=', jogadorId)
      .where('grupo_id', '=', grupoId)
      .executeTakeFirst();
    return existe ? 'ok' : 'nao_encontrado';
  }
  try {
    const r = await banco
      .updateTable('periodos_ativos')
      .set(campos)
      .where('id', '=', periodoId)
      .where('jogador_id', '=', jogadorId)
      .where('grupo_id', '=', grupoId)
      .executeTakeFirst();
    return Number(r.numUpdatedRows) > 0 ? 'ok' : 'nao_encontrado';
  } catch (erro) {
    const { constraint } = erro as { constraint?: string };
    if (constraint === 'periodo_fim_depois_inicio') throw new PeriodoInvalido();
    if (constraint === 'periodos_um_aberto') throw new JaAtivo();
    throw erro;
  }
}
