import type { Data } from '../datas/datas.js';

/** Ausência não tem linha de presença: vale 0 (RN-03). */
export type SituacaoPresenca = 'presente' | 'lesionado' | 'expulso';

export interface Pesos {
  presencaSemChuva: number;
  presencaComChuva: number;
  lesionadoSemChuva: number;
  lesionadoComChuva: number;
  expulsoSemChuva: number;
  expulsoComChuva: number;
}

export interface ConfigPesos extends Pesos {
  vigenteDesde: Data;
  registradoEm: string;
}

export interface PresencaDoJogador {
  data: Data;
  choveu: boolean;
  situacao: SituacaoPresenca;
}
