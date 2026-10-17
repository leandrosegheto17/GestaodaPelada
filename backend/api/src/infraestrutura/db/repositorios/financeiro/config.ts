import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../../cliente.js';

export interface ConfigFinanceira {
  mensalidadeCentavos: number | null;
  saldoInicialCentavos: number;
  dataSaldoInicial: string;
}

export async function lerConfig(ex: ExecutorDb, grupoId: string): Promise<ConfigFinanceira | null> {
  const r = await sql<{ mensalidade: number | null; saldo: number; data: string }>`
    SELECT mensalidade_centavos AS mensalidade, saldo_inicial_centavos AS saldo, data_saldo_inicial::text AS data
    FROM config_financeira WHERE grupo_id = ${grupoId}
  `.execute(kyselyDe(ex));
  const l = r.rows[0];
  return l ? { mensalidadeCentavos: l.mensalidade, saldoInicialCentavos: l.saldo, dataSaldoInicial: l.data } : null;
}

/** Grava a configuração (uma por grupo) e devolve a anterior, se havia. */
export async function salvarConfig(
  ex: ExecutorDb,
  grupoId: string,
  dados: ConfigFinanceira,
): Promise<ConfigFinanceira | null> {
  const anterior = await lerConfig(ex, grupoId);
  await sql`
    INSERT INTO config_financeira (grupo_id, mensalidade_centavos, saldo_inicial_centavos, data_saldo_inicial)
    VALUES (${grupoId}, ${dados.mensalidadeCentavos}, ${dados.saldoInicialCentavos}, ${dados.dataSaldoInicial}::date)
    ON CONFLICT (grupo_id) DO UPDATE SET
      mensalidade_centavos = EXCLUDED.mensalidade_centavos,
      saldo_inicial_centavos = EXCLUDED.saldo_inicial_centavos,
      data_saldo_inicial = EXCLUDED.data_saldo_inicial
  `.execute(kyselyDe(ex));
  return anterior;
}
