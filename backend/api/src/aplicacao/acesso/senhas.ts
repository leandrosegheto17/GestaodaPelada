import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as auditoria from '../../infraestrutura/db/repositorios/auditoria.js';
import * as contas from '../../infraestrutura/db/repositorios/contas.js';
import * as pedidos from '../../infraestrutura/db/repositorios/pedidos-reset.js';
import * as sessoes from '../../infraestrutura/db/repositorios/sessoes.js';
import { gerarSenhaTemporaria } from '../../infraestrutura/seguranca/senha-temporaria.js';

/**
 * Redefinição de senha de uma conta. Quem chama decide quem pode: o dono redefine a de um admin,
 * um admin redefine a de outro admin do mesmo grupo (nunca a própria) e o script do dono redefine
 * a do dono. Este módulo só executa.
 */
export class ContaNaoEncontrada extends Error {
  constructor() {
    super('Conta não encontrada.');
  }
}

export interface SenhaRedefinida {
  contaId: string;
  nome: string;
  /** Aparece uma única vez, na resposta de quem redefiniu. */
  senhaTemporaria: string;
}

/**
 * Gera uma senha temporária, grava o hash marcando-a como temporária, encerra todas as sessões
 * da conta, resolve o pedido pendente (se houver) e audita, tudo numa transação.
 */
export async function redefinirSenha(
  db: Db,
  contaId: string,
  autor: auditoria.AutorAuditoria,
  agora: Date,
): Promise<SenhaRedefinida> {
  return emTransacao(db, async (tx) => {
    const conta = await contas.buscarPorId(tx, contaId);
    if (!conta) throw new ContaNaoEncontrada();

    const senhaTemporaria = gerarSenhaTemporaria();
    await contas.trocarSenha(tx, contaId, senhaTemporaria, { temporaria: true });
    await sessoes.encerrarTodasDaConta(tx, contaId);
    await pedidos.resolverPorConta(tx, contaId, {
      resolvidoPor: autor.tipo === 'conta' ? autor.contaId : null,
      agora,
    });
    await auditoria.registrar(tx, null, {
      autor,
      acao: 'senha_redefinida',
      entidade: 'conta',
      entidadeId: contaId,
      agora,
    });
    return { contaId, nome: conta.nome, senhaTemporaria };
  });
}
