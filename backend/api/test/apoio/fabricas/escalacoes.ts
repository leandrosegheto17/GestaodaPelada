import type { ExecutorDb } from '../../../src/infraestrutura/db/index.js';
import * as escalacoes from '../../../src/infraestrutura/db/repositorios/escalacoes.js';
import type { EscalacaoGravar } from '../../../src/infraestrutura/db/repositorios/escalacoes.js';
import type { Fabrica } from '../fabrica.js';
import { executarSql } from '../sql.js';

/** Confirma uma escalação pelo repositório e registra a limpeza (o produto não exclui escalação). */
export async function criarEscalacao(
  db: ExecutorDb,
  fabrica: Fabrica,
  grupoId: string,
  contaId: string,
  parcial: Partial<EscalacaoGravar> = {},
): Promise<EscalacaoGravar> {
  const dados: EscalacaoGravar = {
    data: '2026-10-22',
    formato: 'dois_times',
    n: 7,
    k: 2,
    composicao: { times: [] },
    confirmadaPor: contaId,
    confirmadaEm: new Date('2026-10-16T12:00:00Z'),
    ...parcial,
  };
  await escalacoes.confirmar(db, grupoId, dados);
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM escalacoes WHERE grupo_id = $1 AND data = $2::date', [grupoId, dados.data]);
  });
  return dados;
}
