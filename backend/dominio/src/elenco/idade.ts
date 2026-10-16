import type { Data } from '../datas/datas.js';

/** Idade = ano de hoje − ano de nascimento (RN-12); não considera mês nem dia. */
export function calcularIdade(anoNascimento: number, hoje: Data): number {
  return Number(hoje.slice(0, 4)) - anoNascimento;
}
