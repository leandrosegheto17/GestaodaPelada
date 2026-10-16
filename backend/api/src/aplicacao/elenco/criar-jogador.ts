import type { JogadorDetalhe } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { ApelidoEmUso } from '../../infraestrutura/db/repositorios/jogadores.js';
import { carregarDetalhe } from './detalhe.js';
import { MSG_APELIDO_EM_USO } from './mensagens.js';

export type ResultadoCriarJogador =
  { ok: true; jogador: JogadorDetalhe } | { ok: false; campos: Record<string, string> };

export interface EntradaCriarJogador {
  apelido: string;
  anoNascimento: number;
  posicao: string;
  telefone: string | null;
  dataEntrada?: string | undefined;
}

/** Cria o jogador com o período aberto desde a data de entrada (padrão: hoje). */
export async function criarJogador(
  db: Db,
  grupoId: string,
  entrada: EntradaCriarJogador,
  contexto: { hoje: string; autor: string; agora: Date },
): Promise<ResultadoCriarJogador> {
  try {
    const id = await emTransacao(db, (tx) =>
      jogadores.criar(tx, grupoId, {
        apelido: entrada.apelido,
        anoNascimento: entrada.anoNascimento,
        posicao: entrada.posicao,
        telefone: entrada.telefone,
        dataEntrada: entrada.dataEntrada ?? contexto.hoje,
        autor: contexto.autor,
        agora: contexto.agora,
      }),
    );
    const jogador = await carregarDetalhe(db, grupoId, id, contexto.hoje);
    if (!jogador) throw new Error('Jogador criado não encontrado.');
    return { ok: true, jogador };
  } catch (erro) {
    if (erro instanceof ApelidoEmUso) return { ok: false, campos: { apelido: MSG_APELIDO_EM_USO } };
    throw erro;
  }
}
