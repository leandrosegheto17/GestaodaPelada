import type { PeriodoCorrigirResposta } from '@pelada/contrato';
import type { CampoPeriodo } from '@pelada/dominio';
import type { Db } from '../../infraestrutura/db/index.js';
import { emTransacao } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { corrigirPeriodo } from '../../infraestrutura/db/repositorios/periodos-corrigir.js';
import { avaliarPedidoDePeriodos } from './avaliacao-periodos.js';
import { listarPeriodos } from './periodos-listar.js';

export type ResultadoCorrigirPeriodo =
  | { tipo: 'ok'; resposta: PeriodoCorrigirResposta }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'invalida'; campo: CampoPeriodo; mensagem: string };

/**
 * Corrige a saída (fim) e/ou o retorno (início) de um período numa transação: trava o jogador (dois pedidos
 * juntos se enfileiram e o segundo parte do que o primeiro gravou), avalia com a mesma regra da prévia
 * dentro da transação e audita com datas, acumulado e posição antes e depois. Datas iguais às atuais não
 * gravam nem auditam.
 */
export async function corrigirPeriodoDoJogador(
  db: Db,
  grupoId: string,
  jogadorId: string,
  periodoId: string,
  corpo: { saida?: string | undefined; retorno?: string | undefined },
  contexto: { hoje: string; autor: string; agora: Date },
): Promise<ResultadoCorrigirPeriodo> {
  const { saida, retorno } = corpo;
  try {
    return await emTransacao(db, async (tx): Promise<ResultadoCorrigirPeriodo> => {
      if (!(await jogadores.travar(tx, grupoId, jogadorId))) return { tipo: 'nao_encontrado' };
      const r = await avaliarPedidoDePeriodos(
        tx,
        grupoId,
        jogadorId,
        {
          operacao: 'corrigir',
          periodoId,
          ...(saida !== undefined ? { saida } : {}),
          ...(retorno !== undefined ? { retorno } : {}),
        },
        { hoje: contexto.hoje },
      );
      if (r.tipo === 'nao_encontrado') return { tipo: 'nao_encontrado' };
      if (r.tipo === 'recusa') return { tipo: 'invalida', campo: r.campo, mensagem: r.mensagem };

      if (r.tipo === 'ok') {
        const antes = (await jogadores.buscar(tx, grupoId, jogadorId))?.periodos.find((p) => p.id === periodoId);
        if (!antes) return { tipo: 'nao_encontrado' };
        const gravou = await corrigirPeriodo(tx, grupoId, jogadorId, periodoId, {
          ...(retorno !== undefined ? { inicio: retorno } : {}),
          ...(saida !== undefined ? { fim: saida } : {}),
        });
        if (gravou === 'nao_encontrado') return { tipo: 'nao_encontrado' };
        await auditoria.registrar(tx, grupoId, {
          autor: { tipo: 'conta', contaId: contexto.autor },
          acao: 'jogador_periodo_corrigido',
          entidade: 'jogador',
          entidadeId: jogadorId,
          resumo: {
            periodo: periodoId,
            saidaAnterior: antes.fim,
            saidaNova: saida ?? antes.fim,
            retornoAnterior: antes.inicio,
            retornoNovo: retorno ?? antes.inicio,
            acumuladoAntes: r.previa.acumuladoAntes,
            acumuladoDepois: r.previa.acumuladoDepois,
            posicaoAntes: r.previa.posicaoAntes,
            posicaoDepois: r.previa.posicaoDepois,
          },
          agora: contexto.agora,
        });
      }
      const lista = await listarPeriodos(tx, grupoId, jogadorId);
      if (!lista) return { tipo: 'nao_encontrado' };
      return { tipo: 'ok', resposta: { alterado: r.tipo === 'ok', periodos: lista.periodos } };
    });
  } catch (erro) {
    if (!(erro instanceof jogadores.PeriodoInvalido)) throw erro;
    return { tipo: 'invalida', campo: saida !== undefined ? 'saida' : 'retorno', mensagem: erro.message };
  }
}
