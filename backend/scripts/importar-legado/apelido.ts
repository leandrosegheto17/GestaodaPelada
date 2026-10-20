import { LIMITES } from '@pelada/contrato';
import { ErroLegado } from './tipos.ts';

/** Primeiro caractere que uma planilha interpretaria como fórmula. */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

/** Apelido do arquivo, validado com o mesmo limite do cadastro e sem cara de fórmula de planilha. */
export function apelidoDoArquivo(texto: string, linha: number): string {
  const apelido = texto.trim();
  if (apelido.length < LIMITES.apelido.min || apelido.length > LIMITES.apelido.max) {
    throw new ErroLegado(`apelido fora de ${LIMITES.apelido.min} a ${LIMITES.apelido.max} caracteres.`, linha);
  }
  if (INICIO_DE_FORMULA.test(apelido)) throw new ErroLegado('apelido começa com caractere de fórmula.', linha);
  return apelido;
}
