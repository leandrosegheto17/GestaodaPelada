import {
  DIAS_DA_SEMANA,
  FORMATOS_SIMULADOR,
  FREQUENCIAS,
  POSICOES,
  SITUACOES_COMERCIAIS,
  SITUACOES_PRESENCA,
  TIPOS_LANCAMENTO,
  type DiaSemana,
  type FormatoSimulador,
  type Frequencia,
  type Posicao,
  type SituacaoComercial,
  type SituacaoPresenca,
  type TipoLancamento,
} from '@pelada/contrato';

/** Único lugar com texto de enum do contrato; a ordem de exibição segue o mockup. */

export const ROTULO_SITUACAO_PRESENCA = {
  ausente: { letra: 'A', texto: 'Ausente' },
  presente: { letra: 'P', texto: 'Presente' },
  lesionado: { letra: 'L', texto: 'Lesionado' },
  expulso: { letra: 'E', texto: 'Expulso' },
} as const satisfies Record<SituacaoPresenca, { letra: string; texto: string }>;
export const ORDEM_SITUACAO_PRESENCA: readonly SituacaoPresenca[] = SITUACOES_PRESENCA;

export const ROTULO_POSICAO = {
  goleiro: 'Goleiro',
  defensor: 'Defensor',
  meio_campo: 'Meio-campo',
  atacante: 'Atacante',
} as const satisfies Record<Posicao, string>;
export const ORDEM_POSICAO: readonly Posicao[] = POSICOES;

export const ROTULO_FREQUENCIA = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
} as const satisfies Record<Frequencia, string>;
export const ORDEM_FREQUENCIA: readonly Frequencia[] = FREQUENCIAS;

export const ROTULO_DIA_SEMANA = {
  domingo: 'Domingo',
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado',
} as const satisfies Record<DiaSemana, string>;
export const ORDEM_DIA_SEMANA: readonly DiaSemana[] = DIAS_DA_SEMANA;

export const ROTULO_SITUACAO_COMERCIAL = {
  uso_proprio: 'Uso próprio',
  trial: 'Trial',
  ativo: 'Ativo',
  inadimplente: 'Inadimplente',
  cancelado: 'Cancelado',
} as const satisfies Record<SituacaoComercial, string>;
export const ORDEM_SITUACAO_COMERCIAL: readonly SituacaoComercial[] = SITUACOES_COMERCIAIS;

export const ROTULO_TIPO_LANCAMENTO = {
  entrada: 'Entrada',
  saida: 'Saída',
} as const satisfies Record<TipoLancamento, string>;
export const ORDEM_TIPO_LANCAMENTO: readonly TipoLancamento[] = TIPOS_LANCAMENTO;

export const ROTULO_FORMATO_SIMULADOR = {
  dois_times: '2 times (1º e 2º tempo)',
  varios_times: '3 ou mais times',
} as const satisfies Record<FormatoSimulador, string>;
export const ORDEM_FORMATO_SIMULADOR: readonly FormatoSimulador[] = FORMATOS_SIMULADOR;

export const rotuloSituacaoPresenca = (v: SituacaoPresenca) => ROTULO_SITUACAO_PRESENCA[v];
export const rotuloPosicao = (v: Posicao): string => ROTULO_POSICAO[v];
export const rotuloFrequencia = (v: Frequencia): string => ROTULO_FREQUENCIA[v];
export const rotuloDiaSemana = (v: DiaSemana): string => ROTULO_DIA_SEMANA[v];
export const rotuloSituacaoComercial = (v: SituacaoComercial): string => ROTULO_SITUACAO_COMERCIAL[v];
export const rotuloTipoLancamento = (v: TipoLancamento): string => ROTULO_TIPO_LANCAMENTO[v];
export const rotuloFormatoSimulador = (v: FormatoSimulador): string => ROTULO_FORMATO_SIMULADOR[v];
