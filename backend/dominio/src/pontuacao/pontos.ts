import { compararDatas, type Data } from '../datas/datas.js';
import { criarResolvedorDePesos, type ResolvedorDePesos } from './pesos.js';
import type { ConfigPesos, Pesos, PresencaDoJogador, SituacaoPresenca } from './tipos.js';

/** Pontos de uma presença; expulso tem peso único, com ou sem chuva (RN-01). */
export function pontosDaPresenca(
  situacao: SituacaoPresenca,
  choveu: boolean,
  pesos: Pesos,
): number {
  switch (situacao) {
    case 'expulso':
      return pesos.expulso;
    case 'lesionado':
      return choveu ? pesos.lesionadoComChuva : pesos.lesionadoSemChuva;
    case 'presente':
      return choveu ? pesos.presencaComChuva : pesos.presencaSemChuva;
  }
}

function resolvedor(configs: readonly ConfigPesos[] | ResolvedorDePesos): ResolvedorDePesos {
  return typeof configs === 'function' ? configs : criarResolvedorDePesos(configs);
}

export function pontosNaData(
  situacao: SituacaoPresenca,
  choveu: boolean,
  data: Data,
  configs: readonly ConfigPesos[] | ResolvedorDePesos,
): number {
  return pontosDaPresenca(situacao, choveu, resolvedor(configs)(data));
}

/** Soma das presenças com data ≤ `referencia` (inclusive). */
export function acumuladoAte(
  presencas: readonly PresencaDoJogador[],
  configs: readonly ConfigPesos[] | ResolvedorDePesos,
  referencia: Data,
): number {
  const resolver = resolvedor(configs);
  let total = 0;
  for (const p of presencas) {
    if (compararDatas(p.data, referencia) <= 0) {
      total += pontosDaPresenca(p.situacao, p.choveu, resolver(p.data));
    }
  }
  return total;
}
