import { jogadorDetalhe, type JogadorDetalhe } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as habilidades from '../../infraestrutura/db/repositorios/habilidades.js';
import * as jogadores from '../../infraestrutura/db/repositorios/jogadores.js';
import { POSICAO_PADRAO } from './listar.js';
import { nivelDaResposta } from './nivel.js';
import { situacaoAtual } from './situacao.js';

/** Jogador com situação, notas do catálogo inteiro (nula onde não há) e nível. `null` se não é do grupo. */
export async function carregarDetalhe(
  ex: ExecutorDb,
  grupoId: string,
  jogadorId: string,
  hoje: string,
): Promise<JogadorDetalhe | null> {
  const [jogador, notas] = await Promise.all([
    jogadores.buscar(ex, grupoId, jogadorId),
    habilidades.notasDoJogador(ex, grupoId, jogadorId),
  ]);
  if (!jogador) return null;
  const preenchidas = notas.flatMap((n) => (n.nota === null ? [] : [n.nota]));
  return jogadorDetalhe.parse({
    id: jogador.id,
    apelido: jogador.apelido,
    // Jogador anonimizado (LGPD) não tem ano nem posição; o contrato exige valores.
    anoNascimento: jogador.anoNascimento ?? 0,
    posicao: jogador.posicao ?? POSICAO_PADRAO,
    telefone: jogador.telefone,
    pontuacaoInicial: jogador.pontuacaoInicial,
    situacao: situacaoAtual(jogador.periodos, hoje),
    ...nivelDaResposta(preenchidas),
    notas,
  });
}
