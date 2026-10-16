import type { EscalacaoConfirmada, EscalacaoCorpo } from '@pelada/contrato';
import { emTransacao, type Db } from '../../infraestrutura/db/index.js';
import * as escalacoes from '../../infraestrutura/db/repositorios/escalacoes.js';
import * as eventos from '../../infraestrutura/db/repositorios/eventos.js';
import { ativosNaData } from '../elenco/ativos.js';
import { idsDaComposicao } from './composicao.js';

export type ResultadoConfirmar =
  { ok: true; confirmada: EscalacaoConfirmada } | { ok: false; campos: Record<string, string> };

export const MSG_COMPOSICAO_FORA_DO_GRUPO = 'Há jogadores que não estão ativos no grupo nesta data.';

export { idsDaComposicao } from './composicao.js';

export interface DependenciasConfirmar {
  /** Troca o registro do evento (testes de atomicidade). */
  registrarEvento: typeof eventos.registrar;
}

/**
 * Confirma a escalação da data: a gravação (que substitui a anterior da mesma data) e o evento de uso
 * entram na mesma transação, então um erro em qualquer passo desfaz os dois. Todo jogador da composição
 * precisa estar ativo no grupo na data. `agora` vem do relógio da API.
 */
export async function confirmarEscalacao(
  db: Db,
  grupoId: string,
  corpo: EscalacaoCorpo,
  contexto: { contaId: string; agora: Date },
  deps: DependenciasConfirmar = { registrarEvento: eventos.registrar },
): Promise<ResultadoConfirmar> {
  const ativos = new Set((await ativosNaData(db, grupoId, corpo.data)).map((j) => j.id));
  if (!idsDaComposicao(corpo).every((id) => ativos.has(id))) {
    return { ok: false, campos: { composicao: MSG_COMPOSICAO_FORA_DO_GRUPO } };
  }

  await emTransacao(db, async (tx) => {
    await escalacoes.confirmar(tx, grupoId, {
      data: corpo.data,
      formato: corpo.formato,
      n: corpo.n,
      k: corpo.formato === 'dois_times' && corpo.k !== 'ilimitado' ? corpo.k : null,
      composicao: corpo.composicao,
      confirmadaPor: contexto.contaId,
      confirmadaEm: contexto.agora,
    });
    await deps.registrarEvento(tx, grupoId, {
      tipo: 'escalacao_confirmada',
      dataPartida: corpo.data,
      momento: contexto.agora,
    });
  });
  return { ok: true, confirmada: { data: corpo.data, confirmadaEm: contexto.agora.toISOString() } };
}
