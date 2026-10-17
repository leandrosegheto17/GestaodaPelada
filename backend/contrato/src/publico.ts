import { z } from 'zod';
import { diaSemana, frequencia, situacaoPresenca } from './enums.js';
import { data, horario, mes, uuid } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

/**
 * Projeção pública (G-10): só o que o link do grupo pode mostrar. Todo objeto é `strict`,
 * então telefone, ano de nascimento, idade, posição em campo, notas, nível e financeiro
 * nunca passam.
 */
export const grupoPublico = z.strictObject({
  nome: z.string(),
  slug: z.string(),
  diaSemana,
  frequencia,
  horario,
});

/** Situação do jogador numa rodada: a da presença, `falta` (ativo e ausente) ou `fora` ("–"). */
export const SITUACOES_RODADA = [...situacaoPresenca.options.filter((s) => s !== 'ausente'), 'falta', 'fora'] as const;
export const situacaoRodada = z.enum(SITUACOES_RODADA);

export const rodadaPublica = z.strictObject({
  situacao: situacaoRodada,
  /** Nulo na rodada "–" (jogador fora do grupo na data). */
  pontos: z.number().int().nullable(),
});

export const linhaRanking = z.strictObject({
  /** Colocação no ranking (empatados repetem o número). */
  posicao: z.number().int().min(1),
  apelido: z.string(),
  ptsInicial: z.number().int(),
  rodadas: z.array(rodadaPublica),
  ptsFinal: z.number().int(),
});

export const partidaPublica = z.strictObject({ data, choveu: z.boolean() });

export const rankingPublico = z.strictObject({
  grupo: grupoPublico,
  mes,
  hoje: data,
  geradoEm: z.iso.datetime(),
  enderecoNovo: z.url().nullable(),
  navegacao: z.strictObject({ mesAnterior: mes.nullable(), mesSeguinte: mes.nullable() }),
  resumoMes: z.strictObject({
    partidas: z.number().int().min(0),
    comChuva: z.number().int().min(0),
  }),
  partidas: z.array(partidaPublica),
  linhas: z.array(linhaRanking),
});
export type RankingPublico = z.infer<typeof rankingPublico>;

export type LinhaRankingPublica = z.infer<typeof linhaRanking>;

export const rankingPublicoConsulta = z.strictObject({ mes: mes.optional() });

export const eventoPublicoCorpo = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('ranking_aberto'), dispositivoId: uuid }),
  z.strictObject({ tipo: z.literal('pdf_exportado'), mes }),
]);
export type EventoPublicoCorpo = z.infer<typeof eventoPublicoCorpo>;

export const esquemasPublico: Esquemas = {
  'publico.ranking.consulta': { direcao: 'entrada', schema: rankingPublicoConsulta },
  'publico.ranking': { direcao: 'resposta', schema: rankingPublico },
  'publico.eventos.corpo': { direcao: 'entrada', schema: eventoPublicoCorpo },
};
