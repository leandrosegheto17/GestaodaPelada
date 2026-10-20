import { z } from 'zod';

export const SITUACOES_PRESENCA = ['ausente', 'presente', 'lesionado', 'expulso'] as const;
export const situacaoPresenca = z.enum(SITUACOES_PRESENCA);
export type SituacaoPresenca = z.infer<typeof situacaoPresenca>;

/** Em ordem de exibição (do fundo do campo para o ataque, goleiro por último). */
export const POSICOES = ['zagueiro', 'lateral', 'volante', 'meia', 'atacante', 'centroavante', 'goleiro'] as const;
export const posicao = z.enum(POSICOES);
export type Posicao = z.infer<typeof posicao>;

export const FREQUENCIAS = ['semanal', 'quinzenal', 'mensal'] as const;
export const frequencia = z.enum(FREQUENCIAS);
export type Frequencia = z.infer<typeof frequencia>;

export const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
export const diaSemana = z.enum(DIAS_DA_SEMANA);
export type DiaSemana = z.infer<typeof diaSemana>;

export const SITUACOES_COMERCIAIS = ['uso_proprio', 'trial', 'ativo', 'inadimplente', 'cancelado'] as const;
export const situacaoComercial = z.enum(SITUACOES_COMERCIAIS);
export type SituacaoComercial = z.infer<typeof situacaoComercial>;

export const TIPOS_LANCAMENTO = ['entrada', 'saida'] as const;
export const tipoLancamento = z.enum(TIPOS_LANCAMENTO);
export type TipoLancamento = z.infer<typeof tipoLancamento>;

export const FORMATOS_SIMULADOR = ['dois_times', 'varios_times'] as const;
export const formatoSimulador = z.enum(FORMATOS_SIMULADOR);
export type FormatoSimulador = z.infer<typeof formatoSimulador>;

export const ESCOPOS_SESSAO = ['completo', 'troca_de_senha'] as const;
export const escopoSessao = z.enum(ESCOPOS_SESSAO);
export type EscopoSessao = z.infer<typeof escopoSessao>;
