import { z } from 'zod';
import { data, mes } from './primitivos.js';
import { grupoPublico, linhaRanking, rankingPublicoConsulta } from './publico.js';
import type { Esquemas } from './registro-tipos.js';

/** Máximo de colunas de partida no PDF (uma página, RF-51). */
export const MAX_COLUNAS_PDF = 12;

const colunaPdf = z.strictObject({ data, choveu: z.boolean(), doMesExibido: z.boolean() });

/**
 * Projeção do PDF do ranking (G-10): a mesma linha do ranking público, as colunas de partida e a origem
 * do documento. Todo objeto é `strict`: nada além de nome e slug do grupo, apelido e pontos.
 */
export const projecaoPdf = z
  .strictObject({
    grupo: grupoPublico.pick({ nome: true, slug: true }).strict(),
    mes,
    geradoEm: z.iso.datetime(),
    urlPublica: z.url(),
    semPartidasNoMes: z.boolean(),
    colunas: z.array(colunaPdf).max(MAX_COLUNAS_PDF),
    linhas: z.array(linhaRanking),
  })
  .superRefine((pdf, contexto) => {
    if (pdf.linhas.some((l) => l.rodadas.length !== pdf.colunas.length)) {
      contexto.addIssue({ code: 'custom', path: ['linhas'], message: 'Cada linha precisa de uma rodada por coluna.' });
    }
    if (pdf.semPartidasNoMes && pdf.colunas.some((c) => c.doMesExibido)) {
      contexto.addIssue({ code: 'custom', path: ['colunas'], message: 'Mês sem partidas não tem coluna do mês.' });
    }
  });
export type ProjecaoPdf = z.infer<typeof projecaoPdf>;

/** A rota do PDF usa a mesma consulta do ranking público (`?mes=`). */
export const pdfConsulta = rankingPublicoConsulta;

export const esquemasPdf: Esquemas = {
  'pdf.consulta': { direcao: 'entrada', schema: pdfConsulta },
  'pdf.projecao': { direcao: 'resposta', schema: projecaoPdf },
};
