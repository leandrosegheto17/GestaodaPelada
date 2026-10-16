import { partidaDetalhe, type PartidaDetalhe, type SituacaoPresenca } from '@pelada/contrato';
import { ativoEm } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../infraestrutura/db/repositorios/partidas.js';
import { montarLinhas } from './linhas.js';

/**
 * Partida de uma data com as linhas de presença (ativos na data mais quem já tem presença, para
 * nenhuma presença ficar oculta na edição) e a última alteração. `null` se não há partida.
 */
export async function carregarPartida(
  ex: ExecutorDb,
  grupoId: string,
  data: string,
  hoje: string,
): Promise<PartidaDetalhe | null> {
  const partida = await partidas.porData(ex, grupoId, data);
  if (!partida) return null;
  const todos = await jogadores.listar(ex, grupoId);
  const presencas = new Map<string, SituacaoPresenca>(partida.presencas.map((p) => [p.jogadorId, p.situacao]));
  const visiveis = todos.filter((j) => ativoEm(j.periodos, data) || presencas.has(j.id));
  return partidaDetalhe.parse({
    data: partida.data,
    hoje,
    choveu: partida.choveu,
    alteradaPor: partida.alteradaPor,
    alteradaEm: partida.alteradaEm.toISOString(),
    jogadores: montarLinhas(visiveis, presencas),
  });
}
