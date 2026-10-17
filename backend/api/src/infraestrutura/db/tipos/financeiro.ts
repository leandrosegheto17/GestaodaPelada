import type { Generated } from 'kysely';

export interface ConfigFinanceiraTabela {
  grupo_id: string;
  mensalidade_centavos: number | null;
  saldo_inicial_centavos: number;
  data_saldo_inicial: string;
}

export interface LancamentosTabela {
  id: Generated<string>;
  grupo_id: string;
  tipo: 'entrada' | 'saida';
  data: string;
  descricao: string;
  valor_centavos: number;
  criado_por: string;
  criado_em: Date;
  alterado_por: string;
  alterado_em: Date;
}

export interface PagamentosMesTabela {
  grupo_id: string;
  jogador_id: string;
  mes: string;
  lancamento_id: string | null;
  marcado_por: string;
  marcado_em: Date;
}

export interface TabelasFinanceiro {
  config_financeira: ConfigFinanceiraTabela;
  lancamentos: LancamentosTabela;
  pagamentos_mes: PagamentosMesTabela;
}
