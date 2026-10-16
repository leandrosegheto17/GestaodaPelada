import type { Generated } from 'kysely';

export interface EventosUsoTabela {
  id: Generated<string>;
  grupo_id: string;
  tipo: 'ranking_aberto' | 'pdf_exportado' | 'partida_lancada' | 'escalacao_confirmada';
  momento: Date;
  dispositivo_id: string | null;
  mes_exportado: string | null;
  data_partida: string | null;
}

export interface TabelasUso {
  eventos_uso: EventosUsoTabela;
}
