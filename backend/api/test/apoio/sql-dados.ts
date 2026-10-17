import type { ExecutorDb } from '../../src/infraestrutura/db/index.js';
import { criarGrupo, type GrupoCriado } from './fabricas/grupos.js';
import type { Fabrica } from './fabrica.js';
import { executarSql } from './sql.js';

const AGORA = '2026-10-16T12:00:00Z';

export interface Base {
  grupo: GrupoCriado;
  outroGrupo: GrupoCriado;
  contaId: string;
}

/** Dois grupos de fábrica (a conta criadora é a mesma), para os testes de migração e de repositório. */
export async function criarBase(db: ExecutorDb, fabrica: Fabrica): Promise<Base> {
  const grupo = await criarGrupo(db, fabrica);
  const outroGrupo = await criarGrupo(db, fabrica, { criadoPor: grupo.criadoPor });
  return { grupo, outroGrupo, contaId: grupo.criadoPor };
}

/** Insere um jogador por SQL e registra a limpeza (períodos, notas e presenças antes dele). */
export async function inserirJogador(
  fabrica: Fabrica,
  base: { contaId: string },
  grupoId: string,
  apelido: string,
  extras: { ano?: number | null; posicao?: string | null; telefone?: string | null } = {},
): Promise<string> {
  const linhas = await executarSql<{ id: string }>(
    `INSERT INTO jogadores (grupo_id, apelido, ano_nascimento, posicao, telefone, criado_por, criado_em, alterado_por, alterado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $6, $7) RETURNING id`,
    [grupoId, apelido, extras.ano ?? 1990, extras.posicao ?? 'atacante', extras.telefone ?? null, base.contaId, AGORA],
  );
  const id = linhas[0]?.id as string;
  fabrica.registrar(async () => {
    await executarSql('DELETE FROM pagamentos_mes WHERE jogador_id = $1', [id]);
    await executarSql('DELETE FROM presencas WHERE jogador_id = $1', [id]);
    await executarSql('DELETE FROM notas WHERE jogador_id = $1', [id]);
    await executarSql('DELETE FROM periodos_ativos WHERE jogador_id = $1', [id]);
    await executarSql('DELETE FROM jogadores WHERE id = $1', [id]);
  });
  return id;
}
