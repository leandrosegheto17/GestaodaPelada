import { sugestaoDois, sugestaoVarios, type SugestaoDois, type SugestaoVarios } from '@pelada/contrato';
import type { SugestaoSim } from '@pelada/dominio';
import { centesimosParaDecimal } from '../elenco/nivel.js';
import type { EntradaMontada } from './entrada.js';
import { textoDoAviso, type ContextoTextos } from './textos-avisos.js';

type Valida = Extract<SugestaoSim, { valida: true }>;
type ValidaDois = Extract<Valida, { formato: 'dois_times' }>;
type ValidaVarios = Extract<Valida, { formato: 'varios_times' }>;

const decimal = (centesimos: number | null): number => centesimosParaDecimal(centesimos ?? 0);

function contexto(entrada: EntradaMontada, nomeDoTime: (i: number) => string): ContextoTextos {
  return { apelidoDe: (id) => entrada.apelidos.get(id) ?? id, nomeDoTime };
}

/** Resultado de "2 times" do domínio na forma do contrato: ids → apelidos nas trocas, × 100 → decimal. */
export function paraSugestaoDois(r: ValidaDois, entrada: EntradaMontada): SugestaoDois {
  const apelido = (id: string) => entrada.apelidos.get(id) ?? id;
  const jogadores = new Map(entrada.aptos.map((a) => [a.id, a]));
  const nomeDoTime = (i: number) => `Time ${'AB'[i]}`;
  const ctx = contexto(entrada, nomeDoTime);
  const k = entrada.k;

  const times = r.composicao.times.map((time, i) => {
    const ind = r.indicadores[i]!;
    const saem = new Set(ind.saem);
    return {
      nome: nomeDoTime(i),
      titulares: time.titulares.map((id) => ({
        id,
        apelido: apelido(id),
        so1oTempo: jogadores.get(id)?.so1oTempo ?? false,
        saiNoIntervalo: saem.has(id),
        semNota: jogadores.get(id)?.semNota ?? false,
      })),
      entramNo2oTempo: time.entram.map((id) => ({
        id,
        apelido: apelido(id),
        so1oTempo: jogadores.get(id)?.so1oTempo ?? false,
        semNota: jogadores.get(id)?.semNota ?? false,
      })),
      trocas: ind.pares.map((p) => ({ sai: apelido(p.sai), entra: apelido(p.entra) })),
      indicadores: {
        nivelSoma1oTempo: decimal(ind.nivelSoma1oTempo),
        nivelMedio1oTempo: decimal(ind.nivelMedio1oTempo),
        nivelSoma2oTempo: decimal(ind.nivelSoma2oTempo),
        nivelMedio2oTempo: decimal(ind.nivelMedio2oTempo),
        idadeMedia: decimal(ind.idadeMedia),
        substituicoes: ind.substituicoes,
      },
    };
  });

  return sugestaoDois.parse({
    formato: 'dois_times',
    data: entrada.data,
    n: entrada.n,
    k,
    avisos: r.avisos.map((a) => ({ tipo: a.tipo, texto: textoDoAviso(a, ctx) })),
    ordemPrioridade: r.ordemPrioridade.map(apelido),
    times,
    naoEntra: r.composicao.naoEntra.map((id) => ({
      id,
      apelido: apelido(id),
      semNota: jogadores.get(id)?.semNota ?? false,
    })),
  });
}

/** Resultado de "3 ou mais times" do domínio na forma do contrato. */
export function paraSugestaoVarios(r: ValidaVarios, entrada: EntradaMontada): SugestaoVarios {
  const apelido = (id: string) => entrada.apelidos.get(id) ?? id;
  const jogadores = new Map(entrada.aptos.map((a) => [a.id, a]));
  const nomeDoTime = (i: number) => `Time ${i + 1}`;
  const ctx = contexto(entrada, nomeDoTime);

  return sugestaoVarios.parse({
    formato: 'varios_times',
    data: entrada.data,
    n: entrada.n,
    avisos: r.avisos.map((a) => ({ tipo: a.tipo, texto: textoDoAviso(a, ctx) })),
    times: r.composicao.times.map((time, i) => {
      const ind = r.indicadores[i]!;
      return {
        nome: nomeDoTime(i),
        incompleto: r.composicao.incompleto === i,
        jogadores: time.jogadores.map((id) => ({
          id,
          apelido: apelido(id),
          semNota: jogadores.get(id)?.semNota ?? false,
        })),
        indicadores: {
          jogadores: ind.jogadores,
          nivelMedio: decimal(ind.nivelMedio),
          nivelSoma: decimal(ind.nivelSoma),
          idadeMedia: decimal(ind.idadeMedia),
        },
      };
    }),
  });
}

export function paraSugestaoContrato(r: Valida, entrada: EntradaMontada): SugestaoDois | SugestaoVarios {
  return r.formato === 'dois_times' ? paraSugestaoDois(r, entrada) : paraSugestaoVarios(r, entrada);
}
