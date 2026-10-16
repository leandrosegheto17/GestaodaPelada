import type { ConfigPesos, JogadorDoRanking, PartidaDoRanking, PresencaDoRanking } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import * as partidas from '../../infraestrutura/db/repositorios/partidas.js';
import * as pesos from '../../infraestrutura/db/repositorios/pesos.js';
import { paraConfigPesosDominio, paraJogadorDominio, paraPartidaDominio, paraPresencaDominio } from './adaptadores.js';

export interface HistoricoDoGrupo {
  jogadores: JogadorDoRanking[];
  partidas: PartidaDoRanking[];
  presencas: PresencaDoRanking[];
  configsPesos: ConfigPesos[];
}

/**
 * Histórico do grupo até a data `ate` (inclusive), no formato do domínio, em 4 consultas:
 * jogadores com períodos, partidas, presenças e pesos. O ranking e o PDF passam o "hoje" de
 * São Paulo; o simulador passa a véspera da partida (RN-08). Jogadores inativos entram, porque
 * o histórico deles conta nos meses passados.
 */
export async function carregarHistoricoGrupo(ex: ExecutorDb, grupoId: string, ate: string): Promise<HistoricoDoGrupo> {
  const [lista, historico, configs] = await Promise.all([
    jogadores.listar(ex, grupoId),
    partidas.historicoAte(ex, grupoId, ate),
    pesos.historico(ex, grupoId),
  ]);
  return {
    jogadores: lista.map(paraJogadorDominio),
    partidas: historico.partidas.map(paraPartidaDominio),
    presencas: historico.presencas.map(paraPresencaDominio),
    configsPesos: configs.filter((c) => c.vigenteDesde <= ate).map(paraConfigPesosDominio),
  };
}
