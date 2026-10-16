import type { Generated } from 'kysely';

export interface ContasTabela {
  id: Generated<string>;
  email: string;
  nome: string;
  senha_hash: string;
  senha_temporaria: Generated<boolean>;
  e_dono: Generated<boolean>;
  aviso_privacidade_visto_em: Date | null;
  criada_em: Date;
}

export interface SessoesTabela {
  id: Generated<string>;
  token_hash: Buffer;
  conta_id: string;
  escopo: 'completo' | 'troca_de_senha';
  criada_em: Date;
  ultimo_uso_em: Date;
  expira_em: Date;
}

export interface TentativasLoginTabela {
  id: Generated<string>;
  email: string;
  momento: Date;
  sucesso: boolean;
}

export interface PedidosResetTabela {
  id: Generated<string>;
  conta_id: string;
  ultimo_pedido_em: Date;
  resolvido_em: Date | null;
  resolvido_por: string | null;
}

export interface AuditoriaTabela {
  id: Generated<string>;
  autor_tipo: 'conta' | 'infraestrutura';
  autor_conta_id: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  grupo_id: string | null;
  momento: Date;
  resumo: Generated<Record<string, unknown>>;
}

export interface TabelasAcesso {
  contas: ContasTabela;
  sessoes: SessoesTabela;
  tentativas_login: TentativasLoginTabela;
  pedidos_reset: PedidosResetTabela;
  auditoria: AuditoriaTabela;
}
