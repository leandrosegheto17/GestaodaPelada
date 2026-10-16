import { diaSemana, data as esquemaData, partidaNova, type PartidaNova } from '@pelada/contrato';
import { compararDatas, dataSugeridaPartida } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';
import * as partidas from '../../infraestrutura/db/repositorios/partidas.js';
import { ativosNaData } from '../elenco/ativos.js';
import { indiceDiaSemana } from '../grupos/dia-semana.js';
import { montarLinhas } from './linhas.js';

export class DataInvalida extends Error {
  constructor() {
    super('Data inválida.');
  }
}
export class DataFutura extends Error {
  constructor() {
    super('A data não pode ser no futuro.');
  }
}
export class PartidaJaExiste extends Error {
  constructor(readonly data: string) {
    super('Já existe uma partida nesta data.');
  }
}

/**
 * Dados para lançar uma partida: a data (padrão: a sugerida, o dia de jogo mais recente até hoje),
 * os jogadores ativos nela por apelido, todos como ausentes. Data futura ou já lançada é recusada.
 */
export async function prepararPartidaNova(
  ex: ExecutorDb,
  grupoId: string,
  entrada: { data?: string | undefined; hoje: string },
): Promise<PartidaNova> {
  const grupo = await grupos.buscarPorId(ex, grupoId);
  if (!grupo) throw new Error('Grupo do vínculo não encontrado.');
  const sugerida = dataSugeridaPartida(entrada.hoje, indiceDiaSemana(diaSemana.parse(grupo.diaSemana)));
  const data = entrada.data ?? sugerida;
  if (!esquemaData.safeParse(data).success) throw new DataInvalida();
  if (compararDatas(data, entrada.hoje) > 0) throw new DataFutura();
  if (await partidas.porData(ex, grupoId, data)) throw new PartidaJaExiste(data);

  const ativos = await ativosNaData(ex, grupoId, data);
  return partidaNova.parse({
    data,
    dataSugerida: sugerida,
    hoje: entrada.hoje,
    jaExiste: false,
    preMarcadaPelaEscalacao: false,
    choveu: false,
    jogadores: montarLinhas(ativos, new Map()),
  });
}
