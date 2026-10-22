import { z } from 'zod';
import { posicao } from './enums.js';
import { estenderErro } from './erro.js';
import { LIMITES } from './limites.js';
import { data, idResposta } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

/** Nota de 1 a 10 (inteira). Reaproveitada pelo contrato de habilidades. */
export const notaValor = z.number().int().min(LIMITES.nota.min).max(LIMITES.nota.max);

const nivelDecimal = z.number().min(1).max(10);

const MENSAGEM_PONTUACAO_INICIAL = `Informe um número inteiro de ${LIMITES.pontuacaoInicial.min} a ${LIMITES.pontuacaoInicial.max}.`;

/** Pontos de antes da 1ª partida registrada. Só aparece nas rotas de administração. */
const pontuacaoInicial = z
  .number(MENSAGEM_PONTUACAO_INICIAL)
  .int(MENSAGEM_PONTUACAO_INICIAL)
  .min(LIMITES.pontuacaoInicial.min, MENSAGEM_PONTUACAO_INICIAL)
  .max(LIMITES.pontuacaoInicial.max, MENSAGEM_PONTUACAO_INICIAL);

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
  pontuacaoInicial,
  situacao: z.strictObject({ ativo: z.boolean(), desde: data }),
  /** Data de início da pontuação em vigor (sem valor gravado, o início do 1º período); a tela só formata. */
  inicioPontuacao: data,
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
  pontuacaoInicial: pontuacaoInicial.default(0),
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
    pontuacaoInicial: pontuacaoInicial.default(0),
    dataEntrada: data.refine((d) => d <= hoje, 'A data não pode ser no futuro.').optional(),
  });
}

/**
 * Corpo estático de editar: omitir `pontuacaoInicial` mantém o valor atual (criar usa 0). `dataEntrada`
 * continua aceita e é ignorada, porque o app da versão anterior ainda a envia (G-20); a data de início
 * só muda pela rota própria.
 */
export const jogadorEditarCorpoBase = jogadorCorpoBase.extend({ pontuacaoInicial: pontuacaoInicial.optional() });

/** Fábrica do corpo de editar jogador, com as regras que dependem de `hoje`. */
export function jogadorEditarCorpo(hoje: string) {
  return jogadorCorpo(hoje).extend({ pontuacaoInicial: pontuacaoInicial.optional() });
}

export const inativarCorpoBase = z.strictObject({ dataSaida: data.optional() });

/** Sem corpo e `{}` reativam com retorno hoje. */
export const reativarCorpo = z.strictObject({ dataRetorno: data.optional() });

export function inativarCorpo(hoje: string) {
  return z.strictObject({
    dataSaida: data.refine((d) => d <= hoje, 'A data não pode ser no futuro.').optional(),
  });
}

/** Reativar com a regra que depende de `hoje`: o retorno não pode ser no futuro. */
export function reativarCorpoComHoje(hoje: string) {
  return z.strictObject({
    dataRetorno: data.refine((d) => d <= hoje, 'A data não pode ser no futuro.').optional(),
  });
}

const MENSAGEM_FUTURO = 'A data não pode ser no futuro.';

/** Primeira data aceita como início da pontuação; antes disso o dado não faz sentido. */
export const PISO_INICIO = '2000-01-01';
export const MENSAGEM_ANTES_DO_PISO = 'A data de início não pode ser anterior a 01/01/2000.';

/** Corpo estático de alterar a data de início (prévia e gravação). */
export const inicioCorpoBase = z.strictObject({ data });

/** Corpo com a regra que depende de `hoje` (America/Sao_Paulo, vindo do servidor). */
export function inicioCorpo(hoje: string) {
  return z.strictObject({
    data: data.refine((d) => d >= PISO_INICIO, MENSAGEM_ANTES_DO_PISO).refine((d) => d <= hoje, MENSAGEM_FUTURO),
  });
}

const inteiroNaoNegativo = z.number().int().min(0);

/** Efeito de trocar a data de início, sem gravar. Posição nula = jogador inativo, fora do ranking. */
export const inicioPreviaResposta = z.strictObject({
  acumuladoAntes: z.number().int(),
  acumuladoDepois: z.number().int(),
  posicaoAntes: inteiroNaoNegativo.nullable(),
  posicaoDepois: inteiroNaoNegativo.nullable(),
  rodadasQuePassamAConstar: inteiroNaoNegativo,
});

export type InicioPreviaResposta = z.infer<typeof inicioPreviaResposta>;

/** `alterado: false` quando a data enviada já era a atual (nada foi gravado). */
export const inicioEditarResposta = z.strictObject({ inicio: data, alterado: z.boolean() });

export type InicioEditarResposta = z.infer<typeof inicioEditarResposta>;

export const jogadoresConsulta = z.strictObject({ filtro: z.enum(['ativos', 'inativos']).optional() });

export const esquemasElenco: Esquemas = {
  'elenco.consulta': { direcao: 'entrada', schema: jogadoresConsulta },
  'elenco.lista': { direcao: 'resposta', schema: listaJogadores },
  'elenco.detalhe': { direcao: 'resposta', schema: jogadorDetalhe },
  'elenco.corpo': { direcao: 'entrada', schema: jogadorCorpoBase },
  'elenco.editar.corpo': { direcao: 'entrada', schema: jogadorEditarCorpoBase },
  'elenco.inativar.corpo': { direcao: 'entrada', schema: inativarCorpoBase },
  'elenco.reativar.corpo': { direcao: 'entrada', schema: reativarCorpo },
  'elenco.inicio.previa.corpo': { direcao: 'entrada', schema: inicioCorpoBase },
  'elenco.inicio.previa.resposta': { direcao: 'resposta', schema: inicioPreviaResposta },
  'elenco.inicio.editar.corpo': { direcao: 'entrada', schema: inicioCorpoBase },
  'elenco.inicio.editar.resposta': { direcao: 'resposta', schema: inicioEditarResposta },
  'elenco.erro.com-historico': { direcao: 'resposta', schema: erroJogadorComHistorico },
};
