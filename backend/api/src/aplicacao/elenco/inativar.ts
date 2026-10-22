import type { JogadorDetalhe } from '@pelada/contrato';
import type { Db } from '../../infraestrutura/db/index.js';
import { emTransacao } from '../../infraestrutura/db/index.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { PeriodoInvalido } from '../../infraestrutura/db/repositorios/jogadores.js';
import { avaliarPedidoDePeriodos } from './avaliacao-periodos.js';
import { carregarDetalhe } from './detalhe.js';

export type ResultadoInativar =
  | { tipo: 'ok'; jogador: JogadorDetalhe }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'ja_inativo' }
  | { tipo: 'invalida'; campo: 'dataSaida'; mensagem: string };

/**
 * Fecha o período aberto na data de saída: a partir dessa data o jogador sai das linhas do
 * ranking e do lançamento (intervalo semiaberto). Presenças e pontos já acumulados ficam.
 * A validação da data é a avaliação comum de períodos, a mesma da correção e do retorno; tudo
 * numa transação com o jogador travado, para a avaliação valer até a gravação.
 */
export async function inativarJogador(
  db: Db,
  grupoId: string,
  jogadorId: string,
  dataSaida: string,
  hoje: string,
): Promise<ResultadoInativar> {
  const resultado = await emTransacao(
    db,
    async (tx): Promise<Exclude<ResultadoInativar, { tipo: 'ok' }> | { tipo: 'gravado' }> => {
      if (!(await jogadores.travar(tx, grupoId, jogadorId))) return { tipo: 'nao_encontrado' };
      const jogador = await jogadores.buscar(tx, grupoId, jogadorId);
      if (!jogador) return { tipo: 'nao_encontrado' };
      if (!jogador.periodos.some((p) => p.fim === null)) return { tipo: 'ja_inativo' };
      const r = await avaliarPedidoDePeriodos(
        tx,
        grupoId,
        jogadorId,
        { operacao: 'inativar', saida: dataSaida },
        { hoje },
      );
      if (r.tipo === 'nao_encontrado') return { tipo: 'nao_encontrado' };
      if (r.tipo === 'recusa') return { tipo: 'invalida', campo: 'dataSaida', mensagem: r.mensagem };
      try {
        if ((await jogadores.inativar(tx, grupoId, jogadorId, dataSaida)) === 'sem_periodo_aberto') {
          return { tipo: 'ja_inativo' };
        }
      } catch (erro) {
        if (erro instanceof PeriodoInvalido) return { tipo: 'invalida', campo: 'dataSaida', mensagem: erro.message };
        throw erro;
      }
      return { tipo: 'gravado' };
    },
  );
  if (resultado.tipo !== 'gravado') return resultado;
  const atualizado = await carregarDetalhe(db, grupoId, jogadorId, hoje);
  return atualizado ? { tipo: 'ok', jogador: atualizado } : { tipo: 'nao_encontrado' };
}
