import type { EscopoSessao } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as contas from '../../infraestrutura/db/repositorios/contas.js';
import * as sessoes from '../../infraestrutura/db/repositorios/sessoes.js';
import * as tentativas from '../../infraestrutura/db/repositorios/tentativas.js';
import { gerarTokenSessao, hashToken } from '../../infraestrutura/seguranca/token.js';

export type ResultadoEntrar =
  { tipo: 'bloqueado'; liberaEm: Date } | { tipo: 'invalido' } | { tipo: 'ok'; token: string; escopo: EscopoSessao };

/**
 * Login por e-mail e senha. E-mail bloqueado (5 falhas em 15 min) responde sem conferir a senha,
 * exista a conta ou não. O token é sempre novo: nunca reaproveita o cookie recebido.
 */
export async function entrar(db: Db, entrada: { email: string; senha: string }, agora: Date): Promise<ResultadoEntrar> {
  const bloqueio = await tentativas.consultarBloqueio(db, entrada.email, agora);
  if (bloqueio.liberaEm) return { tipo: 'bloqueado', liberaEm: bloqueio.liberaEm };

  const verificada = await contas.verificarSenha(db, entrada.email, entrada.senha);
  if (!verificada) {
    await tentativas.registrar(db, { email: entrada.email, sucesso: false, agora });
    return { tipo: 'invalido' };
  }

  const token = gerarTokenSessao();
  const escopo: EscopoSessao = verificada.senhaTemporaria ? 'troca_de_senha' : 'completo';
  const tokenHash = await hashToken(token);
  await emTransacao(db, async (tx) => {
    await sessoes.criar(tx, { contaId: verificada.contaId, tokenHash, escopo, agora });
    await tentativas.registrar(tx, { email: entrada.email, sucesso: true, agora });
    await tentativas.podar(tx, agora);
  });
  return { tipo: 'ok', token, escopo };
}
