/** Único lugar da API que lê o relógio: "hoje" e o mês são sempre de São Paulo. */
export interface Relogio {
  /** `AAAA-MM-DD` em America/Sao_Paulo. */
  hoje(): string;
  /** `AAAA-MM` em America/Sao_Paulo. */
  mes(): string;
  /** Instante atual em ISO 8601 (UTC). */
  agoraIso(): string;
}

const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function criarRelogio(agora: () => Date = () => new Date()): Relogio {
  const hoje = (): string => formatador.format(agora());
  return {
    hoje,
    mes: () => hoje().slice(0, 7),
    agoraIso: () => agora().toISOString(),
  };
}

/** Relógio que sempre devolve o mesmo instante (testes). */
export function relogioFixo(instanteIso: string): Relogio {
  return criarRelogio(() => new Date(instanteIso));
}
