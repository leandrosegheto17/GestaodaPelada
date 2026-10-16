import { compararDatas, type Data } from '../datas/datas.js';
import type { ConfigPesos, Pesos } from './tipos.js';

/** Pesos com que todo grupo nasce (RN-18). */
export const PESOS_PADRAO: Readonly<Pesos> = {
  presencaSemChuva: 1,
  presencaComChuva: 1,
  lesionadoSemChuva: 1,
  lesionadoComChuva: 1,
  expulso: -1,
};

export type ResolvedorDePesos = (data: Data) => ConfigPesos;

const naOrdemDeVigencia = (a: ConfigPesos, b: ConfigPesos): number =>
  compararDatas(a.vigenteDesde, b.vigenteDesde) ||
  (a.registradoEm < b.registradoEm ? -1 : a.registradoEm > b.registradoEm ? 1 : 0);

/**
 * Ordena as configurações uma vez e resolve a vigente de cada data por busca binária.
 * A vigente é a de maior `vigenteDesde` ≤ data (empate: a registrada por último).
 * Uma data anterior à primeira configuração usa a mais antiga.
 */
export function criarResolvedorDePesos(configs: readonly ConfigPesos[]): ResolvedorDePesos {
  if (configs.length === 0)
    throw new Error('O grupo precisa de ao menos uma configuração de pesos.');
  const ordenadas = [...configs].sort(naOrdemDeVigencia);
  return (data) => {
    let baixo = 0;
    let alto = ordenadas.length - 1;
    let achada = 0;
    while (baixo <= alto) {
      const meio = (baixo + alto) >> 1;
      if (compararDatas(ordenadas[meio]!.vigenteDesde, data) <= 0) {
        achada = meio;
        baixo = meio + 1;
      } else {
        alto = meio - 1;
      }
    }
    return ordenadas[achada]!;
  };
}

export function configVigente(configs: readonly ConfigPesos[], data: Data): ConfigPesos {
  return criarResolvedorDePesos(configs)(data);
}
