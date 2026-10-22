import { diaMes } from '../../formatacao';

/** Quantas datas aparecem por extenso antes do "e mais N". */
export const MAXIMO_DE_DATAS = 5;

/** `['a']` → `a`; `['a','b','c']` → `a, b e c`. */
function juntarComE(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

/** Datas ISO → `dd/mm, dd/mm e dd/mm`; acima de 5, as 5 primeiras e `e mais N`. */
export function listaDeDatas(datas: readonly string[]): string {
  const mostradas = datas.slice(0, MAXIMO_DE_DATAS).map(diaMes);
  const resto = datas.length - mostradas.length;
  return resto > 0 ? `${mostradas.join(', ')} e mais ${resto}` : juntarComE(mostradas);
}
