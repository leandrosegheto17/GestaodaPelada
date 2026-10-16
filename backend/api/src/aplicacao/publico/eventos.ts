import type { EventoPublicoCorpo } from '@pelada/contrato';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import * as eventos from '../../infraestrutura/db/repositorios/eventos.js';

/**
 * Grava o evento anônimo do link público, campo a campo: só `ranking_aberto` (identificador do
 * aparelho) e `pdf_exportado` (mês). Nada da requisição (IP, user-agent) chega aqui.
 */
export async function registrarEventoPublico(
  ex: ExecutorDb,
  grupoId: string,
  corpo: EventoPublicoCorpo,
  agora: Date,
): Promise<void> {
  if (corpo.tipo === 'ranking_aberto') {
    await eventos.registrar(ex, grupoId, {
      tipo: 'ranking_aberto',
      dispositivoId: corpo.dispositivoId,
      momento: agora,
    });
  } else {
    await eventos.registrar(ex, grupoId, { tipo: 'pdf_exportado', mes: corpo.mes, momento: agora });
  }
}
