import type { EscopoSessao } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as contas from '../../infraestrutura/db/repositorios/contas.js';
import * as sessoes from '../../infraestrutura/db/repositorios/sessoes.js';

export interface SessaoQueTroca {
  contaId: string;
  sessaoId: string;
  escopo: EscopoSessao;
}

export type ResultadoTrocaDeSenha = { tipo: 'ok' } | { tipo: 'recusada'; campos: Record<string, string> };

/**
 * Troca a senha da própria conta. No escopo `troca_de_senha` a nova precisa ser diferente da
 * temporária; no escopo completo exige a senha atual. Ao trocar: promove a sessão a completa e
 * encerra as outras sessões da conta.
 */
export async function trocarSenha(
  db: Db,
  sessao: SessaoQueTroca,
  entrada: { senhaAtual?: string | undefined; novaSenha: string },
  agora: Date,
): Promise<ResultadoTrocaDeSenha> {
  const conta = await contas.buscarPorId(db, sessao.contaId);
  if (!conta) return { tipo: 'recusada', campos: { senhaAtual: 'Senha atual incorreta.' } };

  if (sessao.escopo === 'troca_de_senha') {
    if (await contas.verificarSenha(db, conta.email, entrada.novaSenha)) {
      return { tipo: 'recusada', campos: { novaSenha: 'A nova senha precisa ser diferente da temporária.' } };
    }
  } else {
    const atualConfere =
      entrada.senhaAtual !== undefined && (await contas.verificarSenha(db, conta.email, entrada.senhaAtual)) !== null;
    if (!atualConfere) return { tipo: 'recusada', campos: { senhaAtual: 'Senha atual incorreta.' } };
  }

  await emTransacao(db, async (tx) => {
    await contas.trocarSenha(tx, sessao.contaId, entrada.novaSenha, { temporaria: false });
    await sessoes.trocarEscopo(tx, sessao.sessaoId, 'completo');
    await sessoes.encerrarTodasDaConta(tx, sessao.contaId, { exceto: sessao.sessaoId });
    await auditoria.registrar(tx, null, {
      autor: { tipo: 'conta', contaId: sessao.contaId },
      acao: 'senha_trocada',
      entidade: 'conta',
      entidadeId: sessao.contaId,
      agora,
    });
  });
  return { tipo: 'ok' };
}
