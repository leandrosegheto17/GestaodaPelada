import { previaDoInicio, type JogadorDoRanking, type PreviaInicio } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import { carregarHistoricoGrupo, type HistoricoDoGrupo } from '../pontuacao/historico.js';
import { MSG_INICIO_DEPOIS_DA_SAIDA, MSG_INICIO_NO_FUTURO } from './mensagens.js';

export type ResultadoPreviaInicio =
  { tipo: 'ok'; previa: PreviaInicio } | { tipo: 'nao_encontrado' } | { tipo: 'invalida'; mensagem: string };

/** Jogador e histórico do grupo até hoje, com a data de início atual já resolvida. */
export interface ContextoInicio {
  historico: HistoricoDoGrupo;
  jogador: JogadorDoRanking;
  /** Data de início em vigor (sem valor gravado, o início do 1º período). */
  atual: string;
}

export async function carregarContextoInicio(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  hoje: string,
): Promise<ContextoInicio | null> {
  const historico = await carregarHistoricoGrupo(ex, grupoId, hoje);
  const jogador = historico.jogadores.find((j) => j.id === jogadorId);
  const atual = jogador?.inicioPontuacao;
  return jogador && atual !== undefined ? { historico, jogador, atual } : null;
}

/**
 * Datas que a edição recusa: no futuro (o servidor decide o "hoje") ou depois da saída do 1º período,
 * que nunca é alterada. Compartilhada pela prévia e pela gravação para as duas darem a mesma resposta.
 */
export function motivoDeRecusa(contexto: ContextoInicio, novoInicio: string, hoje: string): string | null {
  if (novoInicio > hoje) return MSG_INICIO_NO_FUTURO;
  const fimDoPrimeiro = contexto.jogador.periodos[0]?.fim;
  if (fimDoPrimeiro && novoInicio > fimDoPrimeiro) return MSG_INICIO_DEPOIS_DA_SAIDA;
  return null;
}

export function calcularPrevia(contexto: ContextoInicio, jogadorId: string, novoInicio: string, hoje: string) {
  return previaDoInicio({ ...contexto.historico, hoje, jogadorId, novoInicio });
}

/** Efeito de trocar a data de início, sem gravar nada. */
export async function previaInicio(
  db: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  novoInicio: string,
  hoje: string,
): Promise<ResultadoPreviaInicio> {
  const contexto = await carregarContextoInicio(db, grupoId, jogadorId, hoje);
  if (!contexto) return { tipo: 'nao_encontrado' };
  const mensagem = motivoDeRecusa(contexto, novoInicio, hoje);
  if (mensagem) return { tipo: 'invalida', mensagem };
  return { tipo: 'ok', previa: calcularPrevia(contexto, jogadorId, novoInicio, hoje) };
}
