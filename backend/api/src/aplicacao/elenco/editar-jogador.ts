import type { JogadorDetalhe } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { ApelidoEmUso } from '../../infraestrutura/db/repositorios/jogadores.js';
import { carregarDetalhe } from './detalhe.js';
import type { EntradaCriarJogador } from './criar-jogador.js';
import { MSG_APELIDO_EM_USO } from './mensagens.js';

/** Como o cadastro, mas `pontuacaoInicial` omitida mantém o valor atual. */
export type EntradaEditarJogador = Omit<EntradaCriarJogador, 'pontuacaoInicial'> & {
  pontuacaoInicial?: number | undefined;
};

export type ResultadoEditarJogador =
  | { ok: true; jogador: JogadorDetalhe }
  | { ok: false; naoEncontrado: true }
  | { ok: false; campos: Record<string, string> };

/**
 * Edita os dados cadastrais. `dataEntrada`, se vier (app anterior), é ignorada: a data de início só
 * muda por `editarInicio`.
 */
export async function editarJogador(
  db: Db,
  grupoId: string,
  jogadorId: string,
  entrada: EntradaEditarJogador,
  contexto: { hoje: string; autor: string; agora: Date },
): Promise<ResultadoEditarJogador> {
  try {
    const recusa = await emTransacao(db, async (tx): Promise<ResultadoEditarJogador | null> => {
      const atual = await jogadores.buscar(tx, grupoId, jogadorId);
      if (!atual) return { ok: false, naoEncontrado: true };
      const pontuacaoInicial = entrada.pontuacaoInicial ?? atual.pontuacaoInicial;
      await jogadores.editar(tx, grupoId, jogadorId, {
        apelido: entrada.apelido,
        anoNascimento: entrada.anoNascimento,
        posicao: entrada.posicao,
        telefone: entrada.telefone,
        pontuacaoInicial,
        autor: contexto.autor,
        agora: contexto.agora,
      });
      if (atual.pontuacaoInicial !== pontuacaoInicial) {
        await auditoria.registrar(tx, grupoId, {
          autor: { tipo: 'conta', contaId: contexto.autor },
          acao: 'jogador_pontuacao_inicial_alterada',
          entidade: 'jogador',
          entidadeId: jogadorId,
          resumo: { anterior: atual.pontuacaoInicial, novo: pontuacaoInicial },
          agora: contexto.agora,
        });
      }
      return null;
    });
    if (recusa) return recusa;
  } catch (erro) {
    if (erro instanceof ApelidoEmUso) return { ok: false, campos: { apelido: MSG_APELIDO_EM_USO } };
    throw erro;
  }
  const jogador = await carregarDetalhe(db, grupoId, jogadorId, contexto.hoje);
  return jogador ? { ok: true, jogador } : { ok: false, naoEncontrado: true };
}
