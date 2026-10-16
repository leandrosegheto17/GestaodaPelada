import type { EntradaSimulador, SugestaoSimulador } from '@pelada/contrato';
import { sugerir } from '@pelada/dominio';
import type { ExecutorDb } from '../../infraestrutura/db/index.js';
import { montarEntradaSimulador } from './entrada.js';
import { montarPrevia } from './previa.js';
import { paraSugestaoContrato } from './resultado.js';

export type ResultadoSugerir =
  | { ok: true; sugestao: SugestaoSimulador }
  /** Aptos insuficientes: `descricao` é o texto da prévia. */
  | { ok: false; descricao: string };

/**
 * Sugere os times: a entrada do contrato vira tipos do domínio (com os aptos conferidos no grupo e na
 * data), o domínio decide e o resultado volta na forma do contrato. Lança `AptoInvalido` para ids ruins.
 */
export async function sugerirTimes(
  ex: ExecutorDb,
  grupoId: string,
  entrada: EntradaSimulador,
): Promise<ResultadoSugerir> {
  const previa = montarPrevia(entrada);
  if (!previa.valida) return { ok: false, descricao: previa.descricao };

  const montada = await montarEntradaSimulador(ex, grupoId, entrada);
  const resultado = sugerir({
    formato: montada.formato,
    n: montada.n,
    k: montada.k,
    dataPartida: montada.data,
    aptos: montada.aptos,
    historico: montada.historico,
  });
  if (!resultado.valida) return { ok: false, descricao: previa.descricao };
  return { ok: true, sugestao: paraSugestaoContrato(resultado, montada) };
}
