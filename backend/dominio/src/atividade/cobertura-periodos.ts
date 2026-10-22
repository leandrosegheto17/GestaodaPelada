import { compararDatas, somarDias, type Data } from '../datas/datas.js';
import { ativoEm, type Periodo } from './atividade.js';

export interface EntradaCobertura {
  antes: readonly Periodo[];
  depois: readonly Periodo[];
  datasComPresenca: readonly Data[];
}

export interface ResultadoCobertura {
  /** Datas cobertas antes e não cobertas depois, em ordem crescente e sem repetição. */
  retiradas: Data[];
  /** Menor data de saída aceita: dia seguinte à presença retirada mais tarde. */
  limiteSaida: Data | null;
  /** Maior data de retorno aceita: dia da presença retirada mais cedo. */
  limiteRetorno: Data | null;
}

/**
 * Só bloqueia a presença que a correção tira de um período: a que já estava fora antes
 * (dado importado) não conta (RN-32).
 */
export function coberturaRetirada(entrada: EntradaCobertura): ResultadoCobertura {
  const retiradas = [...new Set(entrada.datasComPresenca)]
    .filter((d) => ativoEm(entrada.antes, d) && !ativoEm(entrada.depois, d))
    .sort(compararDatas);
  if (retiradas.length === 0) return { retiradas, limiteSaida: null, limiteRetorno: null };
  return {
    retiradas,
    limiteSaida: somarDias(retiradas[retiradas.length - 1]!, 1),
    limiteRetorno: retiradas[0]!,
  };
}
