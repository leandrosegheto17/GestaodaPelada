import type { AdminAdicionado } from '@pelada/contrato';
import { emTransacao, type Db, type ExecutorDb } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as contas from '../../infraestrutura/db/repositorios/contas.js';
import * as vinculos from '../../infraestrutura/db/repositorios/vinculos.js';
import { VinculoDuplicado } from '../../infraestrutura/db/repositorios/vinculos.js';
import { gerarSenhaTemporaria } from '../../infraestrutura/seguranca/senha-temporaria.js';

export class AdminJaVinculado extends Error {
  constructor() {
    super('A conta já é admin deste grupo.');
  }
}

export interface NovoAdmin {
  nome: string;
  /** Já normalizado pelo contrato. */
  email: string;
  acessaFinanceiro: boolean;
}

function criadoPor(autor: auditoria.AutorAuditoria): string {
  if (autor.tipo !== 'conta') throw new Error('Só uma conta pode adicionar admin.');
  return autor.contaId;
}

/**
 * Cria a conta (com senha temporária devolvida uma vez) ou, se o e-mail já tem conta, só vincula
 * ao grupo sem tocar na senha. Recebe a transação aberta, para entrar na do chamador.
 */
export async function vincularOuCriarAdmin(
  tx: ExecutorDb,
  grupoId: string,
  admin: NovoAdmin,
  autor: auditoria.AutorAuditoria,
  agora: Date,
): Promise<AdminAdicionado> {
  const existente = await contas.buscarPorEmail(tx, admin.email);
  const responsavel = criadoPor(autor);

  if (existente) {
    try {
      await vinculos.criar(tx, grupoId, {
        contaId: existente.id,
        acessaFinanceiro: admin.acessaFinanceiro,
        criadoPor: responsavel,
        agora,
      });
    } catch (erro) {
      if (erro instanceof VinculoDuplicado) throw new AdminJaVinculado();
      throw erro;
    }
    await auditoria.registrar(tx, grupoId, {
      autor,
      acao: 'admin_vinculado',
      entidade: 'conta',
      entidadeId: existente.id,
      resumo: { acessaFinanceiro: admin.acessaFinanceiro },
      agora,
    });
    return { contaId: existente.id, nome: existente.nome, contaNova: false, senhaTemporaria: null };
  }

  const senhaTemporaria = gerarSenhaTemporaria();
  const contaId = await contas.criar(tx, {
    email: admin.email,
    nome: admin.nome,
    senha: senhaTemporaria,
    senhaTemporaria: true,
    agora,
  });
  await vinculos.criar(tx, grupoId, {
    contaId,
    acessaFinanceiro: admin.acessaFinanceiro,
    criadoPor: responsavel,
    agora,
  });
  await auditoria.registrar(tx, grupoId, {
    autor,
    acao: 'admin_criado',
    entidade: 'conta',
    entidadeId: contaId,
    resumo: { acessaFinanceiro: admin.acessaFinanceiro },
    agora,
  });
  return { contaId, nome: admin.nome, contaNova: true, senhaTemporaria };
}

/** Mesma operação, abrindo a própria transação. */
export function vincularOuCriarAdminEmTransacao(
  db: Db,
  grupoId: string,
  admin: NovoAdmin,
  autor: auditoria.AutorAuditoria,
  agora: Date,
): Promise<AdminAdicionado> {
  return emTransacao(db, (tx) => vincularOuCriarAdmin(tx, grupoId, admin, autor, agora));
}
