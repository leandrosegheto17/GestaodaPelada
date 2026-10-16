import { z } from 'zod';
import { jogadorItem, notaValor } from './elenco.js';
import { LIMITES } from './limites.js';
import { idResposta } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

const MENSAGEM_NOME = `O nome precisa ter de ${LIMITES.habilidade.min} a ${LIMITES.habilidade.max} caracteres.`;

export const nomeHabilidade = z
  .string()
  .trim()
  .min(LIMITES.habilidade.min, MENSAGEM_NOME)
  .max(LIMITES.habilidade.max, MENSAGEM_NOME);

export const habilidade = z.strictObject({ id: idResposta, nome: z.string() });
export type Habilidade = z.infer<typeof habilidade>;

export const listaHabilidades = z.strictObject({ habilidades: z.array(habilidade) });
export type ListaHabilidades = z.infer<typeof listaHabilidades>;

/** Nota gravada (ou apagada, `null`) e o nível do jogador recalculado pelo servidor. */
export const notaSalva = z.strictObject({
  habilidadeId: idResposta,
  nota: notaValor.nullable(),
  ...jogadorItem.pick({ nivel: true, semNota: true }).shape,
});
export type NotaSalva = z.infer<typeof notaSalva>;

/** O mesmo corpo serve a criar (POST) e a renomear (PATCH). A unicidade do nome é da rota. */
export const habilidadeCorpo = z.strictObject({ nome: nomeHabilidade });

/** `null` apaga a nota (a nota pode ficar em branco, RF-36). */
export const notaCorpo = z.strictObject({ nota: notaValor.nullable() });

export const esquemasHabilidades: Esquemas = {
  'habilidades.lista': { direcao: 'resposta', schema: listaHabilidades },
  'habilidades.habilidade': { direcao: 'resposta', schema: habilidade },
  'habilidades.nota-salva': { direcao: 'resposta', schema: notaSalva },
  'habilidades.corpo': { direcao: 'entrada', schema: habilidadeCorpo },
  'habilidades.nota.corpo': { direcao: 'entrada', schema: notaCorpo },
};
