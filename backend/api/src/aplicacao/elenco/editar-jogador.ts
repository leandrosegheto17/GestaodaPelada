import { validarPeriodos } from '@pelada/dominio';
import type { JogadorDetalhe } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { ApelidoEmUso, PeriodoInvalido } from '../../infraestrutura/db/repositorios/jogadores.js';
import { carregarDetalhe } from './detalhe.js';
import type { EntradaCriarJogador } from './criar-jogador.js';
import { MSG_APELIDO_EM_USO, MSG_PERIODO_INVALIDO, MSG_PRESENCA_ANTES_DA_ENTRADA } from './mensagens.js';

export type ResultadoEditarJogador =
  | { ok: true; jogador: JogadorDetalhe }
  | { ok: false; naoEncontrado: true }
  | { ok: false; campos: Record<string, string> };

/**
 * Edita os dados. Uma nova data de entrada move o início do primeiro período e é recusada se
 * deixaria o período inválido ou se há presença anterior a ela (L-11).
 */
export async function editarJogador(
  db: Db,
  grupoId: string,
  jogadorId: string,
  entrada: EntradaCriarJogador,
  contexto: { hoje: string; autor: string; agora: Date },
): Promise<ResultadoEditarJogador> {
  try {
    const recusa = await emTransacao(db, async (tx): Promise<ResultadoEditarJogador | null> => {
      const atual = await jogadores.buscar(tx, grupoId, jogadorId);
      if (!atual) return { ok: false, naoEncontrado: true };
      const primeiro = atual.periodos[0];
      const novaEntrada = entrada.dataEntrada;
      if (novaEntrada !== undefined && primeiro && novaEntrada !== primeiro.inicio) {
        const movidos = atual.periodos.map((p, i) => (i === 0 ? { ...p, inicio: novaEntrada } : p));
        if (!validarPeriodos(movidos).ok) return { ok: false, campos: { dataEntrada: MSG_PERIODO_INVALIDO } };
        if (await jogadores.temPresencaAntesDe(tx, grupoId, jogadorId, novaEntrada)) {
          return { ok: false, campos: { dataEntrada: MSG_PRESENCA_ANTES_DA_ENTRADA } };
        }
      }
      await jogadores.editar(tx, grupoId, jogadorId, {
        apelido: entrada.apelido,
        anoNascimento: entrada.anoNascimento,
        posicao: entrada.posicao,
        telefone: entrada.telefone,
        pontuacaoInicial: entrada.pontuacaoInicial,
        ...(novaEntrada !== undefined ? { dataEntrada: novaEntrada } : {}),
        autor: contexto.autor,
        agora: contexto.agora,
      });
      if (atual.pontuacaoInicial !== entrada.pontuacaoInicial) {
        await auditoria.registrar(tx, grupoId, {
          autor: { tipo: 'conta', contaId: contexto.autor },
          acao: 'jogador_pontuacao_inicial_alterada',
          entidade: 'jogador',
          entidadeId: jogadorId,
          resumo: { anterior: atual.pontuacaoInicial, novo: entrada.pontuacaoInicial },
          agora: contexto.agora,
        });
      }
      return null;
    });
    if (recusa) return recusa;
  } catch (erro) {
    if (erro instanceof ApelidoEmUso) return { ok: false, campos: { apelido: MSG_APELIDO_EM_USO } };
    if (erro instanceof PeriodoInvalido) return { ok: false, campos: { dataEntrada: MSG_PERIODO_INVALIDO } };
    throw erro;
  }
  const jogador = await carregarDetalhe(db, grupoId, jogadorId, contexto.hoje);
  return jogador ? { ok: true, jogador } : { ok: false, naoEncontrado: true };
}
