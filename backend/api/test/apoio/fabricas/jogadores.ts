import { randomBytes } from 'node:crypto';
import { emTransacao, type Db } from '../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';

/**
 * Cria um jogador ativo pelo repositório. A limpeza fica por conta do grupo (a fábrica de grupo
 * apaga tudo que pertence a ele).
 */
export async function criarJogador(
  db: Db,
  grupoId: string,
  autor: string,
  opcoes: { apelido?: string; dataEntrada?: string; ano?: number; posicao?: string; agora?: Date } = {},
): Promise<string> {
  return emTransacao(db, (tx) =>
    jogadores.criar(tx, grupoId, {
      apelido: opcoes.apelido ?? `Jog${randomBytes(4).toString('hex')}`,
      anoNascimento: opcoes.ano ?? 1990,
      posicao: opcoes.posicao ?? 'meio_campo',
      telefone: null,
      dataEntrada: opcoes.dataEntrada ?? '2026-01-01',
      autor,
      agora: opcoes.agora ?? new Date('2026-10-16T12:00:00Z'),
    }),
  );
}
