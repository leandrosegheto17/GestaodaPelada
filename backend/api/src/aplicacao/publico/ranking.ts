import { rankingPublico, type RankingPublico } from '@pelada/contrato';
import { calcularRanking, mesDentroDosLimites, mesDe, type LimitesDeMes } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import type { Grupo } from '../../infraestrutura/db/repositorios/grupos.js';
import { carregarHistoricoGrupo } from '../pontuacao/historico.js';

export type ResultadoRankingPublico = { tipo: 'ok'; ranking: RankingPublico } | { tipo: 'fora_dos_limites' };

type Resultado = ReturnType<typeof calcularRanking>;

/** Cabeçalho público do grupo: só nome, slug e agenda (G-10). Reaproveitado pelo PDF. */
export function cabecalhoPublico(grupo: Grupo) {
  return {
    nome: grupo.nome,
    slug: grupo.slug,
    diaSemana: grupo.diaSemana,
    frequencia: grupo.frequencia,
    horario: grupo.horario,
  };
}

/** Linhas públicas do ranking: o `jogadorId` do domínio não sai. Reaproveitado pelo PDF. */
export function linhasPublicas(linhas: Resultado['linhas']) {
  return linhas.map((l) => ({
    posicao: l.posicao,
    apelido: l.apelido,
    ptsInicial: l.ptsInicial,
    rodadas: l.rodadas.map((r) => ({ situacao: r.situacao, pontos: r.pontos })),
    ptsFinal: l.ptsFinal,
  }));
}

/**
 * O mês está no histórico do grupo? Vai da primeira partida ao mês de hoje; sem partidas, só o mês de hoje.
 * Vale para o ranking público e para o PDF.
 */
export function mesNoHistorico(limites: LimitesDeMes, mes: string, hoje: string): boolean {
  return limites.primeiro === null ? mes === mesDe(hoje) : mesDentroDosLimites(limites, mes);
}

/**
 * Ranking do mês na projeção pública estrita. Mês fora dos limites (da primeira partida ao mês de
 * hoje; sem partidas, só o mês de hoje) não monta nada.
 */
export async function montarRankingPublico(
  ex: ExecutorDb,
  grupo: Grupo,
  contexto: { hoje: string; mes: string; agora: Date; enderecoNovo: string | null },
): Promise<ResultadoRankingPublico> {
  const historico = await carregarHistoricoGrupo(ex, grupo.id, contexto.hoje);
  const r = calcularRanking({ hoje: contexto.hoje, mes: contexto.mes, ...historico });
  if (!mesNoHistorico(r.limites, contexto.mes, contexto.hoje)) return { tipo: 'fora_dos_limites' };
  return {
    tipo: 'ok',
    ranking: rankingPublico.parse({
      grupo: cabecalhoPublico(grupo),
      mes: contexto.mes,
      hoje: contexto.hoje,
      geradoEm: contexto.agora.toISOString(),
      enderecoNovo: contexto.enderecoNovo,
      navegacao: r.navegacao,
      resumoMes: r.resumoMes,
      partidas: r.partidas,
      linhas: linhasPublicas(r.linhas),
    }),
  };
}
