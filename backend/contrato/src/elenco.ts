import { z } from 'zod';
import { posicao } from './enums.js';
import { estenderErro } from './erro.js';
import { LIMITES } from './limites.js';
import { data, idResposta } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

/** Nota de 1 a 10 (inteira). Reaproveitada pelo contrato de habilidades. */
export const notaValor = z.number().int().min(LIMITES.nota.min).max(LIMITES.nota.max);

const nivelDecimal = z.number().min(1).max(10);

export const jogadorItem = z.strictObject({
  id: idResposta,
  apelido: z.string(),
  posicao,
  nivel: nivelDecimal,
  semNota: z.boolean(),
});

export type ListaJogadoresItem = z.infer<typeof jogadorItem>;

export const jogadorInativoItem = jogadorItem.extend({ inativoDesde: data });

/** Ativos e inativos juntos; a tela escolhe o que mostrar. */
export const listaJogadores = z.strictObject({
  ativos: z.array(jogadorItem),
  inativos: z.array(jogadorInativoItem),
});

export type ListaJogadores = z.infer<typeof listaJogadores>;

export const jogadorDetalhe = z.strictObject({
  id: idResposta,
  apelido: z.string(),
  anoNascimento: z.number().int(),
  posicao,
  telefone: z
    .string()
    .regex(/^\d{11}$/)
    .nullable(),
  situacao: z.strictObject({ ativo: z.boolean(), desde: data }),
  nivel: nivelDecimal,
  semNota: z.boolean(),
  notas: z.array(
    z.strictObject({
      habilidadeId: idResposta,
      habilidade: z.string(),
      nota: notaValor.nullable(),
    }),
  ),
});
export type JogadorDetalhe = z.infer<typeof jogadorDetalhe>;

export const erroJogadorComHistorico = estenderErro({
  codigo: z.literal('jogador_com_historico'),
  sugestao: z.literal('inativar'),
});

const MENSAGEM_APELIDO = `O apelido precisa ter de ${LIMITES.apelido.min} a ${LIMITES.apelido.max} caracteres.`;

/**
 * Telefone opcional: aceita `(DD) 9XXXX-XXXX` ou só dígitos e guarda 11 dígitos
 * (DDD de 11 a 99 e 9 como terceiro dígito). Vazio ou `null` vira `null`.
 */
export const telefone = z
  .union([z.string(), z.null()])
  .optional()
  .transform((valor, contexto): string | null => {
    if (valor === undefined || valor === null) return null;
    if (valor.trim() === '') return null;
    const formatado = /^\(\d{2}\) \d{5}-\d{4}$/.test(valor.trim());
    const digitos = valor.trim();
    const soDigitos = /^\d{11}$/.test(digitos);
    if (!formatado && !soDigitos) {
      contexto.addIssue({ code: 'custom', message: 'Informe o telefone como (DD) 9XXXX-XXXX.' });
      return null;
    }
    const limpo = digitos.replace(/\D/g, '');
    if (!/^[1-9][1-9]9\d{8}$/.test(limpo)) {
      contexto.addIssue({ code: 'custom', message: 'Informe o telefone como (DD) 9XXXX-XXXX.' });
      return null;
    }
    return limpo;
  });

const apelido = z.string().trim().min(LIMITES.apelido.min, MENSAGEM_APELIDO).max(LIMITES.apelido.max, MENSAGEM_APELIDO);

/** Corpo estático de criar/editar jogador (sem as regras que dependem de `hoje`). */
export const jogadorCorpoBase = z.strictObject({
  apelido,
  anoNascimento: z.number().int().min(LIMITES.anoNascimentoMin),
  posicao,
  telefone: z.string().nullable().optional(),
  dataEntrada: data.optional(),
});

/** Fábrica do corpo com as regras que dependem de `hoje` (ano máximo e data de entrada). */
export function jogadorCorpo(hoje: string) {
  const anoMaximo = Number(hoje.slice(0, 4)) - LIMITES.idadeMinima;
  return z.strictObject({
    apelido,
    anoNascimento: z
      .number()
      .int()
      .min(LIMITES.anoNascimentoMin, `O ano precisa estar entre ${LIMITES.anoNascimentoMin} e ${anoMaximo}.`)
      .max(anoMaximo, `O ano precisa estar entre ${LIMITES.anoNascimentoMin} e ${anoMaximo}.`),
    posicao,
    telefone,
    dataEntrada: data.refine((d) => d <= hoje, 'A data não pode ser no futuro.').optional(),
  });
}

export const inativarCorpoBase = z.strictObject({ dataSaida: data.optional() });

export const reativarCorpo = z.strictObject({});

export function inativarCorpo(hoje: string) {
  return z.strictObject({
    dataSaida: data.refine((d) => d <= hoje, 'A data não pode ser no futuro.').optional(),
  });
}

export const jogadoresConsulta = z.strictObject({ filtro: z.enum(['ativos', 'inativos']).optional() });

export const esquemasElenco: Esquemas = {
  'elenco.consulta': { direcao: 'entrada', schema: jogadoresConsulta },
  'elenco.lista': { direcao: 'resposta', schema: listaJogadores },
  'elenco.detalhe': { direcao: 'resposta', schema: jogadorDetalhe },
  'elenco.corpo': { direcao: 'entrada', schema: jogadorCorpoBase },
  'elenco.inativar.corpo': { direcao: 'entrada', schema: inativarCorpoBase },
  'elenco.erro.com-historico': { direcao: 'resposta', schema: erroJogadorComHistorico },
};
