import {
  avaliarPeriodos,
  previaDosPeriodos,
  type CampoPeriodo,
  type Operacao,
  type PeriodoComId,
  type PreviaPeriodos,
} from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import { carregarContextoInicio } from './inicio-previa.js';
import { mensagemDaRecusa } from './mensagens-periodos.js';

export type PedidoDePeriodos =
  | { operacao: 'corrigir'; periodoId: string; saida?: string; retorno?: string }
  | { operacao: 'reativar'; dataRetorno: string }
  | { operacao: 'inativar'; saida: string };

export type PreviaDePeriodos = PreviaPeriodos & { aviso: string | null };

export type ResultadoAvaliacaoDePeriodos =
  | { tipo: 'nao_encontrado' }
  | { tipo: 'recusa'; campo: CampoPeriodo; mensagem: string }
  | { tipo: 'nada_a_alterar'; previa: PreviaDePeriodos }
  | { tipo: 'ok'; periodos: Array<{ id?: string; inicio: string; fim: string | null }>; previa: PreviaDePeriodos };

/** Só o pedido de reativar pode dar `ja_ativo` (já há período aberto). */
export type ResultadoAvaliacaoDeReativar = ResultadoAvaliacaoDePeriodos | { tipo: 'ja_ativo' };

const AVISO_SINGULAR = 'Ela vale 0 ponto até você lançar a presença em Editar partida.';
const AVISO_PLURAL = 'Elas valem 0 ponto até você lançar a presença em Editar partida.';

function paraOperacao(pedido: PedidoDePeriodos): Operacao {
  switch (pedido.operacao) {
    case 'corrigir': {
      const { periodoId, saida, retorno } = pedido;
      return {
        tipo: 'corrigir',
        periodoId,
        ...(saida !== undefined ? { saida } : {}),
        ...(retorno !== undefined ? { retorno } : {}),
      };
    }
    case 'reativar':
      return { tipo: 'reativar', dataRetorno: pedido.dataRetorno };
    case 'inativar':
      return { tipo: 'inativar', dataSaida: pedido.saida };
  }
}

/** O aviso só existe quando alguma rodada que passa a constar é falta (vale 0 até lançar a presença). */
function avisoDe(previa: PreviaPeriodos): string | null {
  const faltas = previa.rodadasQuePassamAConstar.filter((r) => r.situacao === 'falta').length;
  if (faltas === 0) return null;
  return faltas === 1 ? AVISO_SINGULAR : AVISO_PLURAL;
}

/**
 * Avaliação única do pedido de períodos de um jogador (corrigir, reativar com retorno retroativo, inativar
 * com saída): a prévia e a gravação chamam esta função e recebem a mesma recusa. Só lê, no executor recebido
 * (`db` ou `tx`), com as quatro consultas do histórico do grupo; quem grava a chama dentro da transação.
 */
export function avaliarPedidoDePeriodos(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  pedido: Extract<PedidoDePeriodos, { operacao: 'reativar' }>,
  contexto: { hoje: string },
): Promise<ResultadoAvaliacaoDeReativar>;
export function avaliarPedidoDePeriodos(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  pedido: PedidoDePeriodos,
  contexto: { hoje: string },
): Promise<ResultadoAvaliacaoDePeriodos>;
export async function avaliarPedidoDePeriodos(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  pedido: PedidoDePeriodos,
  contexto: { hoje: string },
): Promise<ResultadoAvaliacaoDeReativar> {
  const { hoje } = contexto;
  const carregado = await carregarContextoInicio(ex, grupoId, jogadorId, hoje);
  if (!carregado) return { tipo: 'nao_encontrado' };
  const { historico, atual } = carregado;
  const periodos: PeriodoComId[] = historico.periodosComId.get(jogadorId) ?? [];
  if (pedido.operacao === 'corrigir' && !periodos.some((p) => p.id === pedido.periodoId)) {
    return { tipo: 'nao_encontrado' };
  }
  if (pedido.operacao === 'reativar' && periodos.some((p) => p.fim === null)) return { tipo: 'ja_ativo' };

  const partidasPorId = new Map(historico.partidas.map((p) => [p.id, p.data]));
  const datasComPresenca = historico.presencas
    .filter((p) => p.jogadorId === jogadorId)
    .flatMap((p) => partidasPorId.get(p.partidaId) ?? []);

  const avaliacao = avaliarPeriodos({
    periodos,
    operacao: paraOperacao(pedido),
    hoje,
    inicioPontuacao: atual,
    datasComPresenca,
  });
  if (!avaliacao.ok) return { tipo: 'recusa', ...mensagemDaRecusa(avaliacao) };

  const calculada = previaDosPeriodos({
    hoje,
    jogadorId,
    periodosNovos: avaliacao.periodos,
    jogadores: historico.jogadores,
    partidas: historico.partidas,
    presencas: historico.presencas,
    configsPesos: historico.configsPesos,
  });
  if (!avaliacao.alterado) return { tipo: 'nada_a_alterar', previa: { ...calculada, aviso: null } };
  return { tipo: 'ok', periodos: avaliacao.periodos, previa: { ...calculada, aviso: avisoDe(calculada) } };
}
