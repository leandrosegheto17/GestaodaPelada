import { randomBytes } from 'node:crypto';
import { emTransacao, type Db } from '../../../src/infraestrutura/db/index.js';
import * as jogadores from '../../../src/infraestrutura/db/repositorios/jogadores.js';
import { AGORA_TESTE, diaRelativo } from '../relogio.js';

/**
 * Cria um jogador ativo pelo repositório. A limpeza fica por conta do grupo (a fábrica de grupo
 * apaga tudo que pertence a ele).
 */
export async function criarJogador(
  db: Db,
  grupoId: string,
  autor: string,
  opcoes: {
    apelido?: string;
    dataEntrada?: string;
    ano?: number;
    posicao?: string;
    pontuacaoInicial?: number;
    agora?: Date;
  } = {},
): Promise<string> {
  return emTransacao(db, (tx) =>
    jogadores.criar(tx, grupoId, {
      apelido: opcoes.apelido ?? `Jog${randomBytes(4).toString('hex')}`,
      anoNascimento: opcoes.ano ?? 1990,
      posicao: opcoes.posicao ?? 'meia',
      telefone: null,
      pontuacaoInicial: opcoes.pontuacaoInicial ?? 0,
      dataEntrada: opcoes.dataEntrada ?? diaRelativo(-300),
      autor,
      agora: opcoes.agora ?? AGORA_TESTE,
    }),
  );
}
