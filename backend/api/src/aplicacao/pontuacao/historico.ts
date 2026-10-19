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
    configsPesos: pesosAte(configs, ate).map(paraConfigPesosDominio),
  };
}

/**
 * Configurações de pesos vigentes até `ate`. Se todas começam depois (grupo criado hoje e simulação
 * para hoje, com `ate` na véspera), fica a mais antiga: o domínio usa a primeira para datas anteriores a ela.
 */
function pesosAte<T extends { vigenteDesde: string }>(configs: readonly T[], ate: string): T[] {
  const vigentes = configs.filter((c) => c.vigenteDesde <= ate);
  if (vigentes.length > 0 || configs.length === 0) return vigentes;
  return [configs.reduce((a, b) => (b.vigenteDesde < a.vigenteDesde ? b : a))];
}
