import { z } from 'zod';
import { LIMITES } from './limites.js';

const diasDoMes = (ano: number, mes: number): number => {
  if (mes === 2) return ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
};

/** `AAAA-MM-DD` com dígitos ASCII e data de calendário real. */
export const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
  .refine((valor) => {
    const [ano, mes, dia] = valor.split('-').map(Number) as [number, number, number];
    return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDoMes(ano, mes);
  }, 'Data inválida.');

/** `AAAA-MM`, mês de 01 a 12. */
export const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido.');

/** `HH:MM`, de 00:00 a 23:59. */
export const horario = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido.');

export const uuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    'Identificador inválido.',
  );

/** Id que a API devolve: texto não vazio (a forma é decisão da API). */
export const idResposta = z.string().min(1);

export const slug = z
  .string()
  .regex(new RegExp(`^[a-z0-9-]{${LIMITES.slug.min},${LIMITES.slug.max}}$`), 'Link inválido.');

/** Inteiro seguro na faixa (centavos). Recusa decimal, NaN, infinito e texto. */
export const centavos = (min: number, max: number) =>
  z
    .number({ error: 'Informe um valor.' })
    .int('Informe um valor inteiro em centavos.')
    .min(min)
    .max(max)
    .refine(Number.isSafeInteger, 'Valor fora do limite.');

/** E-mail normalizado em minúsculas, até 254 caracteres. */
export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(LIMITES.emailMax, 'E-mail muito longo.')
  .pipe(z.email('Informe um e-mail válido.'));
