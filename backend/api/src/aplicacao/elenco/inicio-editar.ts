import type { Db } from '../../infraestrutura/db/index.js';
import { emTransacao } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { calcularPrevia, carregarContextoInicio, motivoDeRecusa } from './inicio-previa.js';

export type ResultadoEditarInicio =
  | { tipo: 'ok'; inicio: string; alterado: boolean }
  | { tipo: 'nao_encontrado' }
  | { tipo: 'invalida'; mensagem: string };

/**
 * Grava a data de início numa transação: trava a linha do jogador (dois pedidos juntos se enfileiram e o
 * segundo parte do que o primeiro gravou), ajusta o 1º período se a data recuou antes dele e audita com
 * datas e acumulado antes e depois. Data igual à atual não grava nem audita.
 */
export async function editarInicio(
  db: Db,
  grupoId: string,
  jogadorId: string,
  novoInicio: string,
  contexto: { hoje: string; autor: string; agora: Date },
): Promise<ResultadoEditarInicio> {
  return emTransacao(db, async (tx): Promise<ResultadoEditarInicio> => {
    if (!(await jogadores.travar(tx, grupoId, jogadorId))) return { tipo: 'nao_encontrado' };
    const atual = await carregarContextoInicio(tx, grupoId, jogadorId, contexto.hoje);
    if (!atual) return { tipo: 'nao_encontrado' };
    const mensagem = motivoDeRecusa(atual, novoInicio, contexto.hoje);
    if (mensagem) return { tipo: 'invalida', mensagem };
    if (novoInicio === atual.atual) return { tipo: 'ok', inicio: novoInicio, alterado: false };

    const previa = calcularPrevia(atual, jogadorId, novoInicio, contexto.hoje);
    await jogadores.alterarInicio(tx, grupoId, jogadorId, {
      inicio: novoInicio,
      autor: contexto.autor,
      agora: contexto.agora,
    });
    await auditoria.registrar(tx, grupoId, {
      autor: { tipo: 'conta', contaId: contexto.autor },
      acao: 'jogador_inicio_alterado',
      entidade: 'jogador',
      entidadeId: jogadorId,
      resumo: {
        anterior: atual.atual,
        novo: novoInicio,
        acumuladoAntes: previa.acumuladoAntes,
        acumuladoDepois: previa.acumuladoDepois,
      },
      agora: contexto.agora,
    });
    return { tipo: 'ok', inicio: novoInicio, alterado: true };
  });
}
