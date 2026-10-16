import { sql } from 'kysely';
import { kyselyDe, type ExecutorDb } from '../cliente.js';

/**
 * Eventos de uso, em tipos fechados e sem dado pessoal (RF-57): nada de IP, user-agent nem nome.
 * O identificador do dispositivo é anônimo e só existe em `ranking_aberto`.
 */
export type EventoDeUso =
  | { tipo: 'ranking_aberto'; dispositivoId: string; momento: Date }
  | { tipo: 'pdf_exportado'; mes: string; momento: Date }
  | { tipo: 'escalacao_confirmada'; dataPartida: string; momento: Date }
  | { tipo: 'partida_lancada'; dataPartida: string; momento: Date };

export async function registrar(ex: ExecutorDb, grupoId: string, evento: EventoDeUso): Promise<void> {
  await kyselyDe(ex)
    .insertInto('eventos_uso')
    .values({
      grupo_id: grupoId,
      tipo: evento.tipo,
      momento: evento.momento,
      dispositivo_id: evento.tipo === 'ranking_aberto' ? evento.dispositivoId : null,
      mes_exportado: evento.tipo === 'pdf_exportado' ? evento.mes : null,
      data_partida:
        evento.tipo === 'escalacao_confirmada' || evento.tipo === 'partida_lancada' ? evento.dataPartida : null,
    })
    .execute();
}

export interface UsoDaSemana {
  /** Segunda-feira da semana (São Paulo). */
  inicio: string;
  /** Domingo da semana. */
  fim: string;
  aparelhosRanking: number;
  pdfsExportados: number;
  partidasLancadas: number;
  partidasEm48h: number;
  escalacoesConfirmadas: number;
}

/**
 * Uso por semana (segunda a domingo em America/Sao_Paulo), das mais recentes às mais antigas.
 * A semana é a do momento do registro. "Em 48 h": partida lançada até 48 h depois do horário do jogo.
 */
export async function porSemana(ex: ExecutorDb, grupoId: string): Promise<UsoDaSemana[]> {
  const r = await sql<{
    inicio: string;
    fim: string;
    aparelhos: string;
    pdfs: string;
    partidas: string;
    em48h: string;
    escalacoes: string;
  }>`
    SELECT s.inicio::text AS inicio, (s.inicio + 6)::text AS fim,
           count(DISTINCT e.dispositivo_id) FILTER (WHERE e.tipo = 'ranking_aberto') AS aparelhos,
           count(*) FILTER (WHERE e.tipo = 'pdf_exportado') AS pdfs,
           count(*) FILTER (WHERE e.tipo = 'partida_lancada') AS partidas,
           count(*) FILTER (WHERE e.tipo = 'partida_lancada'
                            AND e.momento <= ((e.data_partida + g.horario) AT TIME ZONE 'America/Sao_Paulo') + interval '48 hours') AS em48h,
           count(*) FILTER (WHERE e.tipo = 'escalacao_confirmada') AS escalacoes
    FROM eventos_uso e
    JOIN grupos g ON g.id = e.grupo_id
    CROSS JOIN LATERAL (
      SELECT date_trunc('week', e.momento AT TIME ZONE 'America/Sao_Paulo')::date AS inicio
    ) s
    WHERE e.grupo_id = ${grupoId}
    GROUP BY s.inicio
    ORDER BY s.inicio DESC
  `.execute(kyselyDe(ex));
  return r.rows.map((l) => ({
    inicio: l.inicio,
    fim: l.fim,
    aparelhosRanking: Number(l.aparelhos),
    pdfsExportados: Number(l.pdfs),
    partidasLancadas: Number(l.partidas),
    partidasEm48h: Number(l.em48h),
    escalacoesConfirmadas: Number(l.escalacoes),
  }));
}

/** Aparelhos distintos que abriram o ranking na semana (SP) que contém `hoje`. */
export async function aparelhosDaSemana(ex: ExecutorDb, grupoId: string, hoje: string): Promise<number> {
  const r = await sql<{ total: string }>`
    SELECT count(DISTINCT dispositivo_id) AS total
    FROM eventos_uso
    WHERE grupo_id = ${grupoId} AND tipo = 'ranking_aberto'
      AND date_trunc('week', momento AT TIME ZONE 'America/Sao_Paulo')::date = date_trunc('week', ${hoje}::timestamp)::date
  `.execute(kyselyDe(ex));
  return Number(r.rows[0]?.total ?? 0);
}
