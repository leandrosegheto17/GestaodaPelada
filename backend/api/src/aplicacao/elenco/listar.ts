import { listaJogadores, type ListaJogadores } from '@pelada/contrato';
import { compararApelido } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as habilidades from '../../infraestrutura/db/repositorios/habilidades.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { niveisPorJogador, nivelDaResposta } from './nivel.js';
import { situacaoAtual } from './situacao.js';

export type FiltroDeJogadores = 'ativos' | 'inativos';

/** Posição de quem foi anonimizado (o contrato exige uma). */
export const POSICAO_PADRAO = 'meia';

/** Ativos e inativos do grupo por apelido, com nível; `filtro` esvazia a outra lista. */
export async function listarJogadores(
  ex: ExecutorDb,
  grupoId: string,
  hoje: string,
  filtro?: FiltroDeJogadores,
): Promise<ListaJogadores> {
  const [todos, notas] = await Promise.all([jogadores.listar(ex, grupoId), habilidades.notasDoGrupo(ex, grupoId)]);
  const niveis = niveisPorJogador(notas);

  const ordenados = [...todos].sort(compararApelido);
  const item = (j: jogadores.Jogador) => ({
    id: j.id,
    apelido: j.apelido,
    posicao: j.posicao ?? POSICAO_PADRAO,
    ...(niveis.get(j.id) ?? nivelDaResposta([])),
  });
  const ativos = [];
  const inativos = [];
  for (const j of ordenados) {
    const situacao = situacaoAtual(j.periodos, hoje);
    if (situacao.ativo) ativos.push(item(j));
    else inativos.push({ ...item(j), inativoDesde: situacao.desde });
  }
  return listaJogadores.parse({
    ativos: filtro === 'inativos' ? [] : ativos,
    inativos: filtro === 'ativos' ? [] : inativos,
  });
}
