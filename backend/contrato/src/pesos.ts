import { z } from 'zod';
import { LIMITES } from './limites.js';
import { data } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

const peso = z
  .number()
  .int(`Use um número inteiro de ${LIMITES.peso.min} a ${LIMITES.peso.max}.`)
  .min(LIMITES.peso.min, `Use um número inteiro de ${LIMITES.peso.min} a ${LIMITES.peso.max}.`)
  .max(LIMITES.peso.max, `Use um número inteiro de ${LIMITES.peso.min} a ${LIMITES.peso.max}.`);

const camposDePesos = {
  presencaSemChuva: peso,
  presencaComChuva: peso,
  lesionadoSemChuva: peso,
  lesionadoComChuva: peso,
  expulso: peso,
};

/** Sem data: a vigência de uma nova configuração é sempre o "hoje" do servidor (RF-23). */
export const novosPesosCorpo = z.strictObject(camposDePesos);

export const pesosVigentes = z.strictObject({
  ...camposDePesos,
  vigenteDesde: data,
  registradoPor: z.string(),
});

export const pesosHistorico = pesosVigentes.extend({ vigenteAte: data });

export const painelPesos = z.strictObject({
  hoje: data,
  vigente: pesosVigentes,
  historico: z.array(pesosHistorico),
});
export type PainelPesos = z.infer<typeof painelPesos>;

export const esquemasPesos: Esquemas = {
  'pesos.corpo': { direcao: 'entrada', schema: novosPesosCorpo },
  'pesos.painel': { direcao: 'resposta', schema: painelPesos },
};
