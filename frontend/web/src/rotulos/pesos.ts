import type { PainelPesos } from '@pelada/contrato';

export type ChavePeso = 'presencaSemChuva' | 'presencaComChuva' | 'lesionadoSemChuva' | 'lesionadoComChuva' | 'expulso';

/** Ordem de exibição dos 5 pesos (tabela, formulário e histórico). */
export const ORDEM_PESOS: readonly ChavePeso[] = [
  'presencaSemChuva',
  'presencaComChuva',
  'lesionadoSemChuva',
  'lesionadoComChuva',
  'expulso',
];

/** O compilador recusa peso faltando ou sobrando. */
export const ROTULO_PESO = {
  presencaSemChuva: 'Presença sem chuva',
  presencaComChuva: 'Presença com chuva',
  lesionadoSemChuva: 'Lesionado sem chuva',
  lesionadoComChuva: 'Lesionado com chuva',
  expulso: 'Expulso',
} as const satisfies Record<ChavePeso, string>;

/** Garante, em tempo de compilação, que os 5 pesos do contrato são exatamente estes. */
export type PesosDoContrato = Pick<PainelPesos['vigente'], ChavePeso>;
