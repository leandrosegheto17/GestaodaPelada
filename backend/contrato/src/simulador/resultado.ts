import { z } from 'zod';
import { data, idResposta } from '../primitivos.js';
import { kValor } from './entrada.js';

export const TIPOS_AVISO = [
  'sem_nota',
  'so_1o_tempo_sem_reserva',
  'composicao_diferente',
  'incompleto_pequeno',
] as const;

export const aviso = z.strictObject({ tipo: z.enum(TIPOS_AVISO), texto: z.string().min(1) });

const nivel = z.number();

const titularDois = z.strictObject({
  id: idResposta,
  apelido: z.string(),
  so1oTempo: z.boolean(),
  saiNoIntervalo: z.boolean(),
  semNota: z.boolean(),
});

const reservaDois = z.strictObject({
  id: idResposta,
  apelido: z.string(),
  so1oTempo: z.boolean(),
  semNota: z.boolean(),
});

const timeDois = z.strictObject({
  nome: z.string(),
  titulares: z.array(titularDois),
  entramNo2oTempo: z.array(reservaDois),
  trocas: z.array(z.strictObject({ sai: idResposta, entra: idResposta })),
  indicadores: z.strictObject({
    nivelSoma1oTempo: nivel,
    nivelMedio1oTempo: nivel,
    nivelSoma2oTempo: nivel,
    nivelMedio2oTempo: nivel,
    idadeMedia: z.number(),
    substituicoes: z.number().int().min(0),
  }),
});

export const sugestaoDois = z.strictObject({
  formato: z.literal('dois_times'),
  data,
  n: z.number().int(),
  k: kValor,
  avisos: z.array(aviso),
  ordemPrioridade: z.array(z.string()),
  times: z.tuple([timeDois, timeDois]),
  naoEntra: z.array(z.strictObject({ id: idResposta, apelido: z.string(), semNota: z.boolean() })),
});
export type SugestaoDois = z.infer<typeof sugestaoDois>;

const jogadorVarios = z.strictObject({ id: idResposta, apelido: z.string(), semNota: z.boolean() });

export const sugestaoVarios = z.strictObject({
  formato: z.literal('varios_times'),
  data,
  n: z.number().int(),
  avisos: z.array(aviso),
  times: z.array(
    z.strictObject({
      nome: z.string(),
      incompleto: z.boolean(),
      jogadores: z.array(jogadorVarios),
      indicadores: z.strictObject({
        jogadores: z.number().int().min(0),
        nivelMedio: nivel,
        nivelSoma: nivel,
        idadeMedia: z.number(),
      }),
    }),
  ),
});
export type SugestaoVarios = z.infer<typeof sugestaoVarios>;

export const sugestaoSimulador = z.discriminatedUnion('formato', [sugestaoDois, sugestaoVarios]);
export type SugestaoSimulador = z.infer<typeof sugestaoSimulador>;

/** Avaliar recalcula indicadores e avisos de uma composição editada; não há ordem de prioridade. */
export const avaliacaoDois = sugestaoDois.omit({ ordemPrioridade: true });
export const avaliacaoVarios = sugestaoVarios;
export const avaliacaoSimulador = z.discriminatedUnion('formato', [avaliacaoDois, avaliacaoVarios]);
export type AvaliacaoSimulador = z.infer<typeof avaliacaoSimulador>;
