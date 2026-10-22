import type { JogadorDetalhe } from '@pelada/contrato';
import type { CampoPeriodo } from '@pelada/dominio';
import type { Db } from '../../infraestrutura/db/index.js';
import { emTransacao } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { avaliarPedidoDePeriodos } from './avaliacao-periodos.js';
import { carregarDetalhe } from './detalhe.js';

export type ResultadoReativar =
  | { tipo: 'ok'; jogador: JogadorDetalhe }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'ja_ativo' }
  | { tipo: 'invalida'; campo: CampoPeriodo; mensagem: string };

const MSG_SOBREPOSTO = 'Os períodos não podem se sobrepor.';

/**
 * Abre um novo período em `dataRetorno` (padrão hoje); o acumulado anterior continua valendo. Tudo numa
 * transação: trava o jogador (dois pedidos juntos se enfileiram), avalia com a regra comum de períodos e
 * grava. Retorno anterior a hoje é auditado com saída anterior, acumulado e posição antes e depois.
 */
export async function reativarJogador(
  db: Db,
  grupoId: string,
  jogadorId: string,
  hoje: string,
  contexto?: { dataRetorno?: string | undefined; autor: string; agora: Date },
): Promise<ResultadoReativar> {
  const dataRetorno = contexto?.dataRetorno ?? hoje;
  const resultado = await emTransacao(
    db,
    async (tx): Promise<Exclude<ResultadoReativar, { tipo: 'ok' }> | { tipo: 'gravado' }> => {
      if (!(await jogadores.travar(tx, grupoId, jogadorId))) return { tipo: 'nao_encontrado' };
      const jogador = await jogadores.buscar(tx, grupoId, jogadorId);
      if (!jogador) return { tipo: 'nao_encontrado' };
      if (jogador.periodos.some((p) => p.fim === null)) return { tipo: 'ja_ativo' };

      const r = await avaliarPedidoDePeriodos(tx, grupoId, jogadorId, { operacao: 'reativar', dataRetorno }, { hoje });
      if (r.tipo === 'nao_encontrado') return { tipo: 'nao_encontrado' };
      if (r.tipo === 'recusa') return { tipo: 'invalida', campo: r.campo, mensagem: r.mensagem };

      try {
        if ((await jogadores.reativar(tx, grupoId, jogadorId, dataRetorno)) === null) {
          return { tipo: 'invalida', campo: 'dataRetorno', mensagem: MSG_SOBREPOSTO };
        }
      } catch (erro) {
        if (erro instanceof jogadores.JaAtivo) return { tipo: 'ja_ativo' };
        if (erro instanceof jogadores.PeriodoInvalido)
          return { tipo: 'invalida', campo: 'dataRetorno', mensagem: erro.message };
        throw erro;
      }

      if (contexto && dataRetorno < hoje) {
        const saidas = jogador.periodos.flatMap((p) => p.fim ?? []);
        await auditoria.registrar(tx, grupoId, {
          autor: { tipo: 'conta', contaId: contexto.autor },
          acao: 'jogador_reativado_retroativo',
          entidade: 'jogador',
          entidadeId: jogadorId,
          resumo: {
            retorno: dataRetorno,
            saidaAnterior: saidas.length > 0 ? saidas.reduce((a, b) => (a > b ? a : b)) : null,
            acumuladoAntes: r.previa.acumuladoAntes,
            acumuladoDepois: r.previa.acumuladoDepois,
            posicaoAntes: r.previa.posicaoAntes,
            posicaoDepois: r.previa.posicaoDepois,
          },
          agora: contexto.agora,
        });
      }
      return { tipo: 'gravado' };
    },
  );
  if (resultado.tipo !== 'gravado') return resultado;
  const atualizado = await carregarDetalhe(db, grupoId, jogadorId, hoje);
  return atualizado ? { tipo: 'ok', jogador: atualizado } : { tipo: 'nao_encontrado' };
}
