import { partidasDoMes, type PartidasDoMes } from '@pelada/contrato';
import { compararMeses, mesDe, navegacaoDeMes } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as partidas from '../../infraestrutura/db/repositorios/partidas.js';

export class MesFuturo extends Error {
  constructor() {
    super('O mês não pode ser posterior ao mês atual.');
  }
}

/**
 * Partidas do mês (mais recentes primeiro) com a contagem por situação e os limites de
 * navegação: da primeira partida do grupo até o mês de hoje. Mês futuro é recusado; mês antes
 * da primeira partida volta vazio.
 */
export async function listarPartidasDoMes(
  ex: ExecutorDb,
  grupoId: string,
  entrada: { mes: string; hoje: string },
): Promise<PartidasDoMes> {
  const mesAtual = mesDe(entrada.hoje);
  if (compararMeses(entrada.mes, mesAtual) > 0) throw new MesFuturo();
  const [doMes, primeiro] = await Promise.all([
    partidas.porMes(ex, grupoId, entrada.mes),
    partidas.mesDaPrimeiraPartida(ex, grupoId),
  ]);
  return partidasDoMes.parse({
    mes: entrada.mes,
    hoje: entrada.hoje,
    navegacao: navegacaoDeMes({ primeiro, ultimo: mesAtual }, entrada.mes),
    partidas: doMes,
  });
}
