import { emTransacao, type ExecutorDb } from '../../../src/infraestrutura/db/index.js';
import * as partidas from '../../../src/infraestrutura/db/repositorios/partidas.js';
import type { DadosDaPartida } from '../../../src/infraestrutura/db/repositorios/partidas.js';
import { AGORA_TESTE } from '../relogio.js';

/** Grava uma partida pelo repositório (numa transação) e devolve o id. */
export async function criarPartida(
  db: ExecutorDb,
  grupoId: string,
  data: string,
  autor: string,
  parcial: Partial<DadosDaPartida> = {},
): Promise<string> {
  const dados: DadosDaPartida & { data: string } = {
    data,
    choveu: false,
    presencas: [],
    autor,
    agora: AGORA_TESTE,
    ...parcial,
  };
  return emTransacao(db, (tx) => partidas.criar(tx, grupoId, dados));
}
