const plural = (quantos: number, singular: string, pluralizado: string): string =>
  `${quantos} ${quantos === 1 ? singular : pluralizado}`;

/** "2 times de 7 · 5 reservas"; sem reservas, o sufixo some. */
export function descreverDois(n: number, reservas: number): string {
  const base = `2 times de ${n}`;
  return reservas > 0 ? `${base} · ${plural(reservas, 'reserva', 'reservas')}` : base;
}

/** "4 times de 4 + 1 time incompleto de 2"; sem incompleto, só os completos. */
export function descreverVarios(c: { timesCompletos: number; tamanhoTime: number; tamanhoIncompleto: number }): string {
  const completos = `${plural(c.timesCompletos, 'time', 'times')} de ${c.tamanhoTime}`;
  return c.tamanhoIncompleto > 0 ? `${completos} + 1 time incompleto de ${c.tamanhoIncompleto}` : completos;
}

/** Dois times sem aptos suficientes; informa o maior N possível quando existe um. */
export function descreverDoisInsuficiente(n: number, maiorNPossivel: number | null): string {
  return maiorNPossivel === null
    ? 'Faltam aptos para 2 times.'
    : `Faltam aptos para 2 times de ${n}. Maior N possível: ${maiorNPossivel}.`;
}

/** Três ou mais times sem aptos suficientes; aponta a saída que existir (N menor, formato 2 times). */
export function descreverVariosInsuficiente(
  aptos: number,
  n: number,
  saidas: { nMenor: boolean; doisTimes: boolean },
): string {
  const base = `Com ${aptos} aptos e N = ${n} não há 3 times.`;
  if (saidas.nMenor && saidas.doisTimes) return `${base} Use N menor ou o formato 2 times.`;
  if (saidas.nMenor) return `${base} Use N menor.`;
  if (saidas.doisTimes) return `${base} Use o formato 2 times.`;
  return base;
}
