import type { Generated } from 'kysely';

export interface JogadoresTabela {
  id: Generated<string>;
  grupo_id: string;
  apelido: string;
  ano_nascimento: number | null;
  posicao: string | null;
  telefone: string | null;
  pontuacao_inicial: Generated<number>;
  criado_por: string;
  criado_em: Date;
  alterado_por: string;
  alterado_em: Date;
}

export interface PeriodosAtivosTabela {
  id: Generated<string>;
  jogador_id: string;
  grupo_id: string;
  /** Coluna `date`: chega como texto `AAAA-MM-DD`. */
  inicio: string;
  fim: string | null;
}

export interface HabilidadesTabela {
  id: Generated<string>;
  grupo_id: string;
  nome: string;
  /** Ordem de cadastro (identidade). */
  ordem: Generated<string>;
}

export interface NotasTabela {
  jogador_id: string;
  habilidade_id: string;
  grupo_id: string;
  valor: number;
}

export interface TabelasElenco {
  jogadores: JogadoresTabela;
  periodos_ativos: PeriodosAtivosTabela;
  habilidades: HabilidadesTabela;
  notas: NotasTabela;
}
