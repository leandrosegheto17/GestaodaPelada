/** `AAAA-MM-DD`. Datas de negócio são texto de calendário, sem fuso. */
export type Data = string;
/** `AAAA-MM`. */
export type Mes = string;
/** 0 = domingo … 6 = sábado. */
export type DiaDaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const doisDigitos = (n: number): string => String(n).padStart(2, '0');

function partes(data: Data): [number, number, number] {
  const [a, m, d] = data.split('-').map(Number) as [number, number, number];
  return [a, m, d];
}

const montar = (ano: number, mes: number, dia: number): Data =>
  `${String(ano).padStart(4, '0')}-${doisDigitos(mes)}-${doisDigitos(dia)}`;

export function mesDe(data: Data): Mes {
  return data.slice(0, 7);
}

export function primeiroDia(mes: Mes): Data {
  return `${mes}-01`;
}

export function ultimoDia(mes: Mes): Data {
  const [ano, m] = mes.split('-').map(Number) as [number, number];
  const dias = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return `${mes}-${doisDigitos(dias)}`;
}

export function mesAnterior(mes: Mes): Mes {
  const [ano, m] = mes.split('-').map(Number) as [number, number];
  return m === 1 ? `${String(ano - 1).padStart(4, '0')}-12` : `${String(ano).padStart(4, '0')}-${doisDigitos(m - 1)}`;
}

export function mesSeguinte(mes: Mes): Mes {
  const [ano, m] = mes.split('-').map(Number) as [number, number];
  return m === 12 ? `${String(ano + 1).padStart(4, '0')}-01` : `${String(ano).padStart(4, '0')}-${doisDigitos(m + 1)}`;
}

/** Negativo, zero ou positivo. O formato fixo torna a comparação de texto correta. */
export function compararDatas(a: Data, b: Data): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compararMeses(a: Mes, b: Mes): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function somarDias(data: Data, n: number): Data {
  const [a, m, d] = partes(data);
  const t = new Date(Date.UTC(a, m - 1, d + n));
  return montar(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function diaDaSemana(data: Data): DiaDaSemana {
  const [a, m, d] = partes(data);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay() as DiaDaSemana;
}
