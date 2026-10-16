import {
  avaliarCorpo,
  type AvaliacaoSimulador,
  type AvaliarCorpo,
  type EntradaSimulador,
  type SugestaoSimulador,
} from '@pelada/contrato';

/**
 * Composição em memória durante o ajuste manual. Só reposiciona ids: nível, pares, substituições e quem
 * sai no intervalo continuam sendo da API (a tela pede `avaliar` a cada ajuste).
 */
export interface TimeLocal {
  titulares: string[];
  entram: string[];
}

export interface ComposicaoDois {
  formato: 'dois_times';
  times: [TimeLocal, TimeLocal];
  naoEntra: string[];
  /** Quem só joga o 1º tempo (vale para onde o jogador estiver). */
  so1oTempo: ReadonlySet<string>;
}

export interface ComposicaoVarios {
  formato: 'varios_times';
  times: string[][];
}

export type ComposicaoLocal = ComposicaoDois | ComposicaoVarios;

export type DestinoDois = { lugar: 'titular' | 'entra'; time: 0 | 1 } | { lugar: 'naoEntra' };
export interface DestinoVarios {
  time: number;
}
export type Destino = DestinoDois | DestinoVarios;

export interface InfoJogador {
  apelido: string;
  semNota: boolean;
}

/** Composição inicial a partir da sugestão da API; o "só 1º tempo" dos aptos vem da entrada. */
export function deSugestao(sugestao: SugestaoSimulador, entrada: EntradaSimulador): ComposicaoLocal {
  if (sugestao.formato === 'varios_times') {
    return { formato: 'varios_times', times: sugestao.times.map((t) => t.jogadores.map((j) => j.id)) };
  }
  const so1oTempo = new Set(entrada.aptos.flatMap((a) => ('so1oTempo' in a && a.so1oTempo ? [a.id] : [])));
  const [a, b] = sugestao.times;
  return {
    formato: 'dois_times',
    times: [
      { titulares: a.titulares.map((j) => j.id), entram: a.entramNo2oTempo.map((j) => j.id) },
      { titulares: b.titulares.map((j) => j.id), entram: b.entramNo2oTempo.map((j) => j.id) },
    ],
    naoEntra: sugestao.naoEntra.map((j) => j.id),
    so1oTempo,
  };
}

/** Apelido e "sem nota" de cada apto, para desenhar a composição local antes de a API responder. */
export function infoDosJogadores(sugestao: SugestaoSimulador): Map<string, InfoJogador> {
  const info = new Map<string, InfoJogador>();
  if (sugestao.formato === 'varios_times') {
    for (const t of sugestao.times)
      for (const j of t.jogadores) info.set(j.id, { apelido: j.apelido, semNota: j.semNota });
    return info;
  }
  for (const t of sugestao.times) {
    for (const j of [...t.titulares, ...t.entramNo2oTempo]) info.set(j.id, { apelido: j.apelido, semNota: j.semNota });
  }
  for (const j of sugestao.naoEntra) info.set(j.id, { apelido: j.apelido, semNota: j.semNota });
  return info;
}

/** Onde o jogador está agora, ou `null` se o id não está na composição. */
export function destinoAtual(comp: ComposicaoLocal, id: string): Destino | null {
  if (comp.formato === 'varios_times') {
    const time = comp.times.findIndex((t) => t.includes(id));
    return time < 0 ? null : { time };
  }
  for (const i of [0, 1] as const) {
    if (comp.times[i].titulares.includes(id)) return { lugar: 'titular', time: i };
    if (comp.times[i].entram.includes(id)) return { lugar: 'entra', time: i };
  }
  return comp.naoEntra.includes(id) ? { lugar: 'naoEntra' } : null;
}

const sem = (lista: readonly string[], id: string) => lista.filter((x) => x !== id);

/** Leva o jogador ao destino (no fim da lista). Destino de outro formato não muda nada. */
export function mover(comp: ComposicaoLocal, id: string, destino: Destino): ComposicaoLocal {
  if (comp.formato === 'varios_times') {
    if (!('time' in destino) || 'lugar' in destino || destino.time < 0 || destino.time >= comp.times.length)
      return comp;
    const alvo = destino.time;
    return { ...comp, times: comp.times.map((t, i) => (i === alvo ? [...sem(t, id), id] : sem(t, id))) };
  }
  if (!('lugar' in destino)) return comp;
  const limpa: ComposicaoDois = {
    ...comp,
    times: [
      { titulares: sem(comp.times[0].titulares, id), entram: sem(comp.times[0].entram, id) },
      { titulares: sem(comp.times[1].titulares, id), entram: sem(comp.times[1].entram, id) },
    ],
    naoEntra: sem(comp.naoEntra, id),
  };
  if (destino.lugar === 'naoEntra') return { ...limpa, naoEntra: [...limpa.naoEntra, id] };
  const times: [TimeLocal, TimeLocal] = [
    { titulares: [...limpa.times[0].titulares], entram: [...limpa.times[0].entram] },
    { titulares: [...limpa.times[1].titulares], entram: [...limpa.times[1].entram] },
  ];
  (destino.lugar === 'titular' ? times[destino.time].titulares : times[destino.time].entram).push(id);
  return { ...limpa, times };
}

/** Troca de lugar dois jogadores (de times diferentes, do mesmo time ou da lista "não entra"). */
export function trocar(comp: ComposicaoLocal, a: string, b: string): ComposicaoLocal {
  const virar = (x: string) => (x === a ? b : x === b ? a : x);
  if (comp.formato === 'varios_times') return { ...comp, times: comp.times.map((t) => t.map(virar)) };
  return {
    ...comp,
    times: [
      { titulares: comp.times[0].titulares.map(virar), entram: comp.times[0].entram.map(virar) },
      { titulares: comp.times[1].titulares.map(virar), entram: comp.times[1].entram.map(virar) },
    ],
    naoEntra: comp.naoEntra.map(virar),
  };
}

/** Liga ou desliga o "só 1º tempo" de um jogador (só em 2 times). */
export function definirSo1oTempo(comp: ComposicaoLocal, id: string, valor: boolean): ComposicaoLocal {
  if (comp.formato !== 'dois_times') return comp;
  const so1oTempo = new Set(comp.so1oTempo);
  if (valor) so1oTempo.add(id);
  else so1oTempo.delete(id);
  return { ...comp, so1oTempo };
}

/** Corpo de `avaliar`; `null` se a composição não passa no schema do contrato. */
export function paraCorpoAvaliar(entrada: EntradaSimulador, comp: ComposicaoLocal): AvaliarCorpo | null {
  const { data, n, aptos } = entrada;
  const corpo =
    comp.formato === 'dois_times' && entrada.formato === 'dois_times'
      ? {
          formato: 'dois_times',
          data,
          n,
          k: entrada.k,
          aptos: aptos.map((a) => ({ id: a.id, so1oTempo: comp.so1oTempo.has(a.id) })),
          composicao: {
            times: comp.times.map((t) => ({
              titulares: t.titulares.map((id) => ({ id, so1oTempo: comp.so1oTempo.has(id) })),
              entramNo2oTempo: t.entram.map((id) => ({ id, so1oTempo: comp.so1oTempo.has(id) })),
            })),
            naoEntra: comp.naoEntra,
          },
        }
      : comp.formato === 'varios_times' && entrada.formato === 'varios_times'
        ? {
            formato: 'varios_times',
            data,
            n,
            aptos: aptos.map((a) => ({ id: a.id })),
            composicao: { times: comp.times.map((jogadores) => ({ jogadores })) },
          }
        : null;
  const analise = avaliarCorpo.safeParse(corpo);
  return analise.success ? analise.data : null;
}

/**
 * O que os cartões mostram: a composição local (posições na hora) com os números da última resposta da API.
 * Os valores de indicadores, trocas e selos de intervalo ficam como estavam até a próxima avaliação.
 */
export function paraExibicao(
  comp: ComposicaoLocal,
  info: ReadonlyMap<string, InfoJogador>,
  ultima: AvaliacaoSimulador,
  n: number,
): AvaliacaoSimulador {
  const quem = (id: string): InfoJogador => info.get(id) ?? { apelido: id, semNota: false };
  if (comp.formato === 'varios_times' && ultima.formato === 'varios_times') {
    return {
      ...ultima,
      times: comp.times.map((ids, i) => ({
        nome: ultima.times[i]?.nome ?? `Time ${i + 1}`,
        incompleto: ids.length < n,
        jogadores: ids.map((id) => ({ id, ...quem(id) })),
        indicadores: ultima.times[i]?.indicadores ?? {
          jogadores: ids.length,
          nivelMedio: 0,
          nivelSoma: 0,
          idadeMedia: 0,
        },
      })),
    };
  }
  if (comp.formato !== 'dois_times' || ultima.formato !== 'dois_times') return ultima;
  const saiam = new Set(ultima.times.flatMap((t) => t.titulares.filter((j) => j.saiNoIntervalo).map((j) => j.id)));
  const [a, b] = ultima.times;
  const montar = (i: 0 | 1, modelo: typeof a) => ({
    nome: modelo.nome,
    titulares: comp.times[i].titulares.map((id) => ({
      id,
      ...quem(id),
      so1oTempo: comp.so1oTempo.has(id),
      saiNoIntervalo: saiam.has(id),
    })),
    entramNo2oTempo: comp.times[i].entram.map((id) => ({ id, ...quem(id), so1oTempo: comp.so1oTempo.has(id) })),
    trocas: modelo.trocas,
    indicadores: modelo.indicadores,
  });
  return {
    ...ultima,
    times: [montar(0, a), montar(1, b)],
    naoEntra: comp.naoEntra.map((id) => ({ id, ...quem(id) })),
  };
}
