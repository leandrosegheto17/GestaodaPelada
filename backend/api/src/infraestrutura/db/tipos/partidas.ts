import type { Generated } from 'kysely';

export interface ConfigPesosTabela {
  id: Generated<string>;
  grupo_id: string;
  vigente_desde: string;
  presenca_sem_chuva: number;
  presenca_com_chuva: number;
  lesionado_sem_chuva: number;
  lesionado_com_chuva: number;
  expulso: number;
  registrado_por: string;
  registrado_em: Date;
}

export interface PartidasTabela {
  id: Generated<string>;
  grupo_id: string;
  data: string;
  choveu: Generated<boolean>;
  criada_por: string;
  criada_em: Date;
  alterada_por: string;
  alterada_em: Date;
}

export interface PresencasTabela {
  partida_id: string;
  jogador_id: string;
  grupo_id: string;
  situacao: 'presente' | 'lesionado' | 'expulso';
}

export interface TabelasPartidas {
  config_pesos: ConfigPesosTabela;
  partidas: PartidasTabela;
  presencas: PresencasTabela;
}
