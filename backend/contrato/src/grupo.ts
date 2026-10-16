import { z } from 'zod';
import { diaSemana, frequencia } from './enums.js';
import { LIMITES } from './limites.js';
import { centavos, data, horario, idResposta, slug } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

export const nomeGrupo = z
  .string()
  .trim()
  .min(
    LIMITES.nomeGrupo.min,
    `O nome precisa ter de ${LIMITES.nomeGrupo.min} a ${LIMITES.nomeGrupo.max} caracteres.`,
  )
  .max(
    LIMITES.nomeGrupo.max,
    `O nome precisa ter de ${LIMITES.nomeGrupo.min} a ${LIMITES.nomeGrupo.max} caracteres.`,
  );

/** Dados que o admin edita e que o dono informa ao criar o grupo. */
export const dadosGrupo = z.strictObject({
  nome: nomeGrupo,
  diaSemana,
  frequencia,
  horario,
});

/** `slug` e `urlPublica` não são editáveis: o `strict` recusa os dois. */
export const editarGrupoCorpo = dadosGrupo;

export const resumoInicio = z.strictObject({
  dataSugeridaPartida: data,
  partidaNaDataSugerida: z.boolean(),
  proximoDiaDeJogo: data,
  escalacaoConfirmadaPara: data.nullable().optional(),
  partidasNoMes: z.number().int().min(0),
  jogadoresAtivos: z.number().int().min(0),
  habilidades: z.number().int().min(0),
  pesosVigentesDesde: data,
  pesosPadrao: z.boolean().optional(),
  admins: z.number().int().min(0),
  aparelhosNaSemana: z.number().int().min(0),
  saldoAtualCentavos: centavos(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
    .nullable()
    .optional(),
});

export const grupoDetalhe = z.strictObject({
  grupo: z.strictObject({
    id: idResposta,
    nome: z.string(),
    slug,
    urlPublica: z.url(),
    diaSemana,
    frequencia,
    horario,
  }),
  permissoes: z.strictObject({ acessaFinanceiro: z.boolean() }),
  hoje: data,
  inicio: resumoInicio,
});
export type GrupoDetalhe = z.infer<typeof grupoDetalhe>;

export const esquemasGrupo: Esquemas = {
  'grupo.editar.corpo': { direcao: 'entrada', schema: editarGrupoCorpo },
  'grupo.detalhe': { direcao: 'resposta', schema: grupoDetalhe },
};
