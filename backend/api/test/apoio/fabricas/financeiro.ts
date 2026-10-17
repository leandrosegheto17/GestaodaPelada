import type { ExecutorDb } from '../../../src/infraestrutura/db/index.js';
import * as financeiro from '../../../src/infraestrutura/db/repositorios/financeiro.js';
import type { LancamentoNovo } from '../../../src/infraestrutura/db/repositorios/financeiro.js';

const AGORA = new Date('2026-10-16T12:00:00Z');

/** Configuração do caixa do grupo (a limpeza fica por conta do grupo). */
export async function criarConfig(
  db: ExecutorDb,
  grupoId: string,
  parcial: Partial<financeiro.ConfigFinanceira> = {},
): Promise<financeiro.ConfigFinanceira> {
  const config = {
    mensalidadeCentavos: 7_500,
    saldoInicialCentavos: 35_000,
    dataSaldoInicial: '2026-02-05',
    ...parcial,
  };
  await financeiro.salvarConfig(db, grupoId, config);
  return config;
}

/** Lançamento avulso pelo repositório. */
export async function criarLancamento(
  db: ExecutorDb,
  grupoId: string,
  autor: string,
  parcial: Partial<LancamentoNovo> = {},
): Promise<string> {
  return financeiro.criarLancamento(
    db,
    grupoId,
    { tipo: 'saida', data: '2026-10-05', descricao: 'Aluguel da quadra', valorCentavos: 80_000, ...parcial },
    autor,
    AGORA,
  );
}
