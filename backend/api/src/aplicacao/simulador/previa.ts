import { previaSimulador, type EntradaPrevia, type PreviaSimulador } from '@pelada/contrato';
import { calcularPrevia } from '@pelada/dominio';
import { descreverDois, descreverDoisInsuficiente, descreverVarios, descreverVariosInsuficiente } from './descricao.js';

/**
 * Prévia ao vivo: quantos times saem com a quantidade de aptos e o N pedidos. Sem banco; os ids só são
 * contados (a pertença e a atividade são conferidas na sugestão). A conta é do domínio.
 */
export function montarPrevia(corpo: EntradaPrevia): PreviaSimulador {
  const aptos = corpo.aptos.length;
  const previa = calcularPrevia({ formato: corpo.formato, n: corpo.n, aptos });

  if (previa.formato === 'dois_times') {
    return previaSimulador.parse(
      previa.valida
        ? {
            formato: previa.formato,
            valida: true,
            descricao: descreverDois(corpo.n, previa.reservas),
            times: previa.times,
            reservas: previa.reservas,
            maiorNPossivel: null,
          }
        : {
            formato: previa.formato,
            valida: false,
            motivo: previa.motivo,
            descricao: descreverDoisInsuficiente(corpo.n, previa.maiorNPossivel),
            maiorNPossivel: previa.maiorNPossivel,
          },
    );
  }
  return previaSimulador.parse(
    previa.valida
      ? {
          formato: previa.formato,
          valida: true,
          descricao: descreverVarios(previa),
          times: previa.times,
          timesCompletos: previa.timesCompletos,
          tamanhoIncompleto: previa.tamanhoIncompleto,
        }
      : {
          formato: previa.formato,
          valida: false,
          motivo: previa.motivo,
          descricao: descreverVariosInsuficiente(aptos, corpo.n, {
            nMenor: previa.nSugerido !== null,
            doisTimes: previa.doisTimesPossivel,
          }),
          nSugerido: previa.nSugerido,
        },
  );
}
