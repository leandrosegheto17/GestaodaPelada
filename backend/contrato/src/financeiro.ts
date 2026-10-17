import { z } from 'zod';
import { tipoLancamento } from './enums.js';
import { estenderErro, CODIGOS_ERRO } from './erro.js';
import { LIMITES } from './limites.js';
import { centavos, data, idResposta, mes, uuid } from './primitivos.js';
import type { Esquemas } from './registro-tipos.js';

const MENSAGEM_DESCRICAO = `A descrição precisa ter de ${LIMITES.descricaoLancamento.min} a ${LIMITES.descricaoLancamento.max} caracteres.`;

/** Saldos de resposta: inteiro seguro, sem o teto de entrada (a soma de lançamentos pode passar dele). */
const saldo = centavos(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
const soma = centavos(0, Number.MAX_SAFE_INTEGER);

/** Configuração do caixa: mensalidade opcional, saldo inicial e a data a partir da qual ele vale. */
export const configFinanceiraCorpo = z.strictObject({
  mensalidadeCentavos: centavos(LIMITES.valorCentavos.min, LIMITES.valorCentavos.max).nullable(),
  saldoInicialCentavos: centavos(LIMITES.saldoInicialCentavos.min, LIMITES.saldoInicialCentavos.max),
  dataSaldoInicial: data,
});
export type ConfigFinanceiraCorpo = z.infer<typeof configFinanceiraCorpo>;

/** Corpo de criar (POST) e editar (PUT) um lançamento. O vínculo com mensalidade não vem do cliente. */
export const lancamentoCorpo = z.strictObject({
  tipo: tipoLancamento,
  data,
  descricao: z
    .string()
    .trim()
    .min(LIMITES.descricaoLancamento.min, MENSAGEM_DESCRICAO)
    .max(LIMITES.descricaoLancamento.max, MENSAGEM_DESCRICAO),
  valorCentavos: centavos(LIMITES.valorCentavos.min, LIMITES.valorCentavos.max),
});
export type LancamentoCorpo = z.infer<typeof lancamentoCorpo>;

export const marcarPagamentoCorpo = z.strictObject({ jogadorId: uuid, mes });
export type MarcarPagamentoCorpo = z.infer<typeof marcarPagamentoCorpo>;

/** Parâmetros de rota do DELETE de pagamento. */
export const pagamentoParametros = z.strictObject({ jogadorId: uuid, mes });

export const mesFinanceiroConsulta = z.strictObject({ mes: mes.optional() });

/** Resposta da configuração: os mesmos campos do corpo, sem os tetos de entrada. */
export const configFinanceira = z.strictObject({
  mensalidadeCentavos: saldo.nullable(),
  saldoInicialCentavos: saldo,
  dataSaldoInicial: data,
});
export type ConfigFinanceira = z.infer<typeof configFinanceira>;

export const pagamentoMes = z.strictObject({ jogadorId: idResposta, apelido: z.string(), pagou: z.boolean() });

/** Lançamento na lista do mês; `mensalidade` marca o que veio de um pagamento (não se edita à mão). */
export const lancamentoMes = z.strictObject({
  id: idResposta,
  tipo: tipoLancamento,
  data,
  descricao: z.string(),
  valorCentavos: saldo,
  mensalidade: z.boolean(),
});

export const lancamento = lancamentoMes.extend({ alteradoPor: z.string(), alteradoEm: z.iso.datetime() });
export type Lancamento = z.infer<typeof lancamento>;

export const mesFinanceiro = z
  .strictObject({
    mes,
    hoje: data,
    navegacao: z.strictObject({ mesAnterior: mes.nullable(), mesSeguinte: mes.nullable() }),
    config: configFinanceira.nullable(),
    saldoAtualCentavos: saldo.nullable(),
    resumoMes: z
      .strictObject({
        entradasCentavos: soma,
        saidasCentavos: soma,
        resultadoCentavos: saldo,
        naoPagaram: z.number().int().min(0),
      })
      .nullable(),
    pagamentos: z.array(pagamentoMes),
    lancamentos: z.array(lancamentoMes),
  })
  .superRefine((m, contexto) => {
    const semConfig = m.config === null;
    if (semConfig !== (m.saldoAtualCentavos === null) || semConfig !== (m.resumoMes === null)) {
      contexto.addIssue({
        code: 'custom',
        path: ['config'],
        message: 'Sem configuração do caixa, não há saldo nem resumo.',
      });
    }
  });
export type MesFinanceiro = z.infer<typeof mesFinanceiro>;

/** 403: o admin é do grupo mas não tem a permissão do financeiro. */
export const erroSemPermissaoFinanceiro = estenderErro({ codigo: z.literal(CODIGOS_ERRO.semPermissaoFinanceiro) });

/** 409: a entrada é a mensalidade de um pagamento marcado; só sai desmarcando o pagamento. */
export const erroLancamentoVinculado = estenderErro({ codigo: z.literal(CODIGOS_ERRO.lancamentoVinculado) });

/** 409: o pagamento do jogador naquele mês já está marcado. */
export const erroPagamentoJaMarcado = estenderErro({ codigo: z.literal(CODIGOS_ERRO.pagamentoJaMarcado) });

export const esquemasFinanceiro: Esquemas = {
  'financeiro.mes.consulta': { direcao: 'entrada', schema: mesFinanceiroConsulta },
  'financeiro.mes': { direcao: 'resposta', schema: mesFinanceiro },
  'financeiro.config.corpo': { direcao: 'entrada', schema: configFinanceiraCorpo },
  'financeiro.config': { direcao: 'resposta', schema: configFinanceira },
  'financeiro.pagamento.corpo': { direcao: 'entrada', schema: marcarPagamentoCorpo },
  'financeiro.pagamento.parametros': { direcao: 'entrada', schema: pagamentoParametros },
  'financeiro.lancamento.corpo': { direcao: 'entrada', schema: lancamentoCorpo },
  'financeiro.lancamento': { direcao: 'resposta', schema: lancamento },
  'financeiro.erro.sem-permissao': { direcao: 'resposta', schema: erroSemPermissaoFinanceiro },
  'financeiro.erro.lancamento-vinculado': { direcao: 'resposta', schema: erroLancamentoVinculado },
  'financeiro.erro.pagamento-ja-marcado': { direcao: 'resposta', schema: erroPagamentoJaMarcado },
};
