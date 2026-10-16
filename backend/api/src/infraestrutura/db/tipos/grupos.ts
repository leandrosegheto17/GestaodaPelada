import type { Generated } from 'kysely';

export interface GruposTabela {
  id: Generated<string>;
  nome: string;
  slug: string;
  dia_semana: string;
  frequencia: string;
  /** `time` do Postgres chega como `HH:MM:SS`. */
  horario: string;
  situacao_comercial: Generated<string>;
  /** `date` chega como `AAAA-MM-DD` (o parser de data do cliente devolve texto). */
  trial_inicio: string | null;
  arquivado_em: Date | null;
  criado_por: string;
  criado_em: Date;
}

export interface VinculosAdminTabela {
  conta_id: string;
  grupo_id: string;
  acessa_financeiro: Generated<boolean>;
  criado_por: string;
  criado_em: Date;
}

export interface TabelasGrupos {
  grupos: GruposTabela;
  vinculos_admin: VinculosAdminTabela;
}
