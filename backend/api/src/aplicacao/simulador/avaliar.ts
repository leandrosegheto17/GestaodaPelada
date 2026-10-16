import { avaliacaoSimulador, type AvaliacaoSimulador, type AvaliarCorpo } from '@pelada/contrato';
import {
  avisosDois,
  avisosVarios,
  indicadoresDois,
  indicadoresVarios,
  type ComposicaoDois,
  type JogadorSim,
} from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import { montarEntradaSimulador, type EntradaMontada } from './entrada.js';
import { paraSugestaoDois, paraSugestaoVarios } from './resultado.js';

export type ResultadoAvaliar =
  | { ok: true; avaliacao: AvaliacaoSimulador }
  /** A composição não cobre todos os aptos. */
  | { ok: false; campos: Record<string, string> };

const MSG_COBERTURA = 'A composição precisa incluir todos os aptos.';

/** Avaliar não devolve ordem de prioridade (a sugestão não é refeita). */
const semOrdemDePrioridade = (sugestao: object): Record<string, unknown> => {
  const resto: Record<string, unknown> = { ...sugestao };
  delete resto['ordemPrioridade'];
  return resto;
};

function cobreTodos(ids: readonly string[], aptos: readonly { id: string }[]): boolean {
  return ids.length === aptos.length && aptos.every((a) => ids.includes(a.id));
}

/**
 * Avalia uma composição editada: recalcula indicadores, pares e avisos do que foi enviado, sem refazer a
 * sugestão (a distribuição não roda). Os aptos são conferidos no grupo e na data como em `sugerir`.
 */
export async function avaliarComposicao(
  ex: ExecutorDb,
  grupoId: string,
  corpo: AvaliarCorpo,
): Promise<ResultadoAvaliar> {
  const montada = await montarEntradaSimulador(ex, grupoId, corpo);

  if (corpo.formato === 'varios_times') {
    const idsEnviados = corpo.composicao.times.flatMap((t) => t.jogadores);
    if (!cobreTodos(idsEnviados, corpo.aptos)) return { ok: false, campos: { composicao: MSG_COBERTURA } };
    const jogadores = new Map(montada.aptos.map((a) => [a.id, a]));
    const composicao = { times: corpo.composicao.times.map((t) => ({ jogadores: [...t.jogadores] })) };
    const sugestao = paraSugestaoVarios(
      {
        valida: true,
        formato: 'varios_times',
        composicao: { ...composicao, incompleto: null },
        indicadores: indicadoresVarios(composicao, jogadores),
        avisos: avisosVarios({ n: corpo.n, comp: composicao, jogadores }),
      },
      montada,
    );
    return { ok: true, avaliacao: avaliacaoSimulador.parse(sugestao) };
  }

  const { times, naoEntra } = corpo.composicao;
  const idsEnviados = [...times.flatMap((t) => [...t.titulares, ...t.entramNo2oTempo].map((j) => j.id)), ...naoEntra];
  if (!cobreTodos(idsEnviados, corpo.aptos)) return { ok: false, campos: { composicao: MSG_COBERTURA } };

  // O "só 1º tempo" vale como está na composição: é o que o admin acabou de ajustar.
  const so1o = new Map(times.flatMap((t) => [...t.titulares, ...t.entramNo2oTempo].map((j) => [j.id, j.so1oTempo])));
  const aptos: JogadorSim[] = montada.aptos.map((a) => ({ ...a, so1oTempo: so1o.get(a.id) ?? a.so1oTempo }));
  const ajustada: EntradaMontada = { ...montada, aptos };
  const jogadores = new Map(aptos.map((a) => [a.id, a]));
  const rank = new Map(aptos.map((a, i) => [a.id, i]));
  const composicao: ComposicaoDois = {
    times: [
      { titulares: times[0].titulares.map((j) => j.id), entram: times[0].entramNo2oTempo.map((j) => j.id) },
      { titulares: times[1].titulares.map((j) => j.id), entram: times[1].entramNo2oTempo.map((j) => j.id) },
    ],
    naoEntra: [...naoEntra],
  };
  const sugestao = paraSugestaoDois(
    {
      valida: true,
      formato: 'dois_times',
      ordemPrioridade: [],
      composicao,
      indicadores: [
        indicadoresDois(composicao.times[0], jogadores, rank),
        indicadoresDois(composicao.times[1], jogadores, rank),
      ],
      avisos: avisosDois({ n: corpo.n, comp: composicao, jogadores, rank }),
    },
    ajustada,
  );
  return { ok: true, avaliacao: avaliacaoSimulador.parse(semOrdemDePrioridade(sugestao)) };
}
