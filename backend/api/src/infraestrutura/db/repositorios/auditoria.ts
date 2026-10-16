import { kyselyDe, type ExecutorDb } from '../cliente.js';

export type AutorAuditoria = { tipo: 'conta'; contaId: string } | { tipo: 'infraestrutura' };

/** Valores simples: o resumo é para pessoas lerem, nunca para guardar segredo. */
export type ResumoAuditoria = Record<string, string | number | boolean | null>;

const CHAVES_PROIBIDAS = /^(senha|token|hash|telefone)/i;

export interface EntradaAuditoria {
  autor: AutorAuditoria;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  resumo?: ResumoAuditoria;
  agora: Date;
}

/**
 * Registra uma ação. `grupoId` é nulo para ações sem grupo (dono, scripts). O resumo é para pessoas:
 * chaves como senha, token, hash e telefone são recusadas antes de chegar ao banco.
 */
export async function registrar(ex: ExecutorDb, grupoId: string | null, entrada: EntradaAuditoria): Promise<void> {
  const resumo = entrada.resumo ?? {};
  const proibida = Object.keys(resumo).find((chave) => CHAVES_PROIBIDAS.test(chave));
  if (proibida) throw new Error(`O resumo da auditoria não aceita a chave "${proibida}".`);

  await kyselyDe(ex)
    .insertInto('auditoria')
    .values({
      autor_tipo: entrada.autor.tipo,
      autor_conta_id: entrada.autor.tipo === 'conta' ? entrada.autor.contaId : null,
      acao: entrada.acao,
      entidade: entrada.entidade,
      entidade_id: entrada.entidadeId ?? null,
      grupo_id: grupoId,
      momento: entrada.agora,
      resumo,
    })
    .execute();
}
