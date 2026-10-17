import { criarRelogio, type Relogio } from '../../src/infraestrutura/relogio/index.js';

/**
 * Relógio fixo no horário de São Paulo (UTC−3 o ano todo desde 2019).
 * Os testes derivam as datas daqui em vez de espalhar literais.
 */
export function relogioFixo(data: string, hora = '12:00'): Relogio {
  const instante = new Date(`${data}T${hora}:00-03:00`);
  return criarRelogio(() => instante);
}

/** "Hoje" fixado uma vez por processo de teste, para que fábricas e testes concordem. */
export const HOJE_TESTE: string = criarRelogio().hoje();

/** Data (AAAA-MM-DD) a `dias` de distância de `base` (negativo = passado). */
export function diaRelativo(dias: number, base: string = HOJE_TESTE): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Instante fixo do "hoje" de teste, ao meio-dia de São Paulo. */
export const AGORA_TESTE: Date = new Date(relogioFixo(HOJE_TESTE).agoraIso());
