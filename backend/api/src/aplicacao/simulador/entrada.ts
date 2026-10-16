import type { EntradaSimulador } from '@pelada/contrato';
import { ativoEm, calcularIdade, calcularNivel, ordenarPrioridade, somarDias, type JogadorSim } from '@pelada/dominio';
import type { HistoricoSim, Limite } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as habilidades from '../../infraestrutura/db/repositorios/habilidades.js';
import { notasPorJogador } from '../elenco/nivel.js';
import { carregarHistoricoGrupo } from '../pontuacao/historico.js';

/** Algum id informado não é de um jogador do grupo ou não está ativo na data. */
export class AptoInvalido extends Error {
  constructor(readonly ids: readonly string[]) {
    super('Há jogadores que não estão ativos no grupo nesta data.');
  }
}

export interface EntradaMontada {
  formato: EntradaSimulador['formato'];
  n: number;
  /** Só em "2 times"; em 3 ou mais times vale `'ilimitado'` sem uso. */
  k: Limite;
  data: string;
  /** Em ordem de prioridade (RN-08). */
  aptos: JogadorSim[];
  /** Histórico até a véspera, para o domínio recalcular a mesma prioridade. */
  historico: HistoricoSim;
  apelidos: Map<string, string>;
}

/**
 * Converte a entrada validada do contrato nos tipos do domínio: histórico até a véspera (só partidas
 * anteriores, RN-08), notas do grupo e aptos conferidos contra o grupo e a atividade na data. A idade usa
 * o ano da data da partida, para a mesma entrada dar sempre a mesma resposta. Nível e idade ficam
 * inteiros (nível × 100); nada além do necessário passa ao domínio (sem telefone nem posição).
 */
export async function montarEntradaSimulador(
  ex: ExecutorDb,
  grupoId: string,
  entrada: EntradaSimulador,
): Promise<EntradaMontada> {
  const [historico, notas] = await Promise.all([
    carregarHistoricoGrupo(ex, grupoId, somarDias(entrada.data, -1)),
    habilidades.notasDoGrupo(ex, grupoId),
  ]);
  const doGrupo = new Map(historico.jogadores.map((j) => [j.id, j]));
  const invalidos = entrada.aptos.filter((a) => {
    const j = doGrupo.get(a.id);
    return !j || !ativoEm(j.periodos, entrada.data);
  });
  if (invalidos.length > 0) throw new AptoInvalido(invalidos.map((a) => a.id));

  const so1oTempo = new Map(entrada.aptos.map((a) => [a.id, 'so1oTempo' in a && a.so1oTempo]));
  const ids = entrada.aptos.map((a) => a.id);
  const ordem = ordenarPrioridade({ dataPartida: entrada.data, aptos: ids, ...historico });
  const porJogador = notasPorJogador(notas);
  const aptos = ordem.map((id): JogadorSim => {
    const j = doGrupo.get(id)!;
    const { nivel, semNota } = calcularNivel(porJogador.get(id) ?? []);
    return {
      id,
      so1oTempo: so1oTempo.get(id) ?? false,
      nivel,
      semNota,
      idade: calcularIdade(j.anoNascimento, entrada.data),
    };
  });
  return {
    formato: entrada.formato,
    n: entrada.n,
    k: entrada.formato === 'dois_times' ? entrada.k : 'ilimitado',
    data: entrada.data,
    aptos,
    historico,
    apelidos: new Map(ordem.map((id) => [id, doGrupo.get(id)!.apelido])),
  };
}
