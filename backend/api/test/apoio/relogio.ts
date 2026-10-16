import { criarRelogio, type Relogio } from '../../src/infraestrutura/relogio/index.js';

/**
 * Relógio fixo no horário de São Paulo (UTC−3 o ano todo desde 2019).
 * Os testes derivam as datas daqui em vez de espalhar literais.
 */
export function relogioFixo(data: string, hora = '12:00'): Relogio {
  const instante = new Date(`${data}T${hora}:00-03:00`);
  return criarRelogio(() => instante);
}
