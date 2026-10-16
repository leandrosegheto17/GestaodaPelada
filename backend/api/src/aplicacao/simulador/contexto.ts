import { contextoSimulador, diaSemana, type ContextoSimulador } from '@pelada/contrato';
import { proximoDiaDeJogo } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as grupos from '../../infraestrutura/db/repositorios/grupos.js';
import * as habilidades from '../../infraestrutura/db/repositorios/habilidades.js';
import { ativosNaData } from '../elenco/ativos.js';
import { niveisPorJogador, nivelDaResposta } from '../elenco/nivel.js';
import { indiceDiaSemana } from '../grupos/dia-semana.js';

/**
 * Quem pode entrar na escalação da data (ativos nela, por apelido), com o nível já calculado.
 * `dataSugerida` é sempre o próximo dia de jogo (hoje incluso), mesmo quando `data` é informada.
 * Só id, apelido, nível e "sem nota" saem daqui.
 */
export async function prepararContexto(
  ex: ExecutorDb,
  grupoId: string,
  { data, hoje }: { data?: string | undefined; hoje: string },
): Promise<ContextoSimulador | null> {
  const grupo = await grupos.buscarPorId(ex, grupoId);
  if (!grupo) return null;
  const dataSugerida = proximoDiaDeJogo(hoje, indiceDiaSemana(diaSemana.parse(grupo.diaSemana)));
  const [ativos, notas] = await Promise.all([
    ativosNaData(ex, grupoId, data ?? dataSugerida),
    habilidades.notasDoGrupo(ex, grupoId),
  ]);
  const niveis = niveisPorJogador(notas);
  return contextoSimulador.parse({
    dataSugerida,
    hoje,
    jogadores: ativos.map((j) => ({ id: j.id, apelido: j.apelido, ...(niveis.get(j.id) ?? nivelDaResposta([])) })),
  });
}
