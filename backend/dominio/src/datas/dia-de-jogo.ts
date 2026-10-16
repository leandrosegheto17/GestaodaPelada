import { diaDaSemana, somarDias, type Data, type DiaDaSemana } from './datas.js';

/** Maior data ≤ `hoje` que cai no dia da semana do grupo (data sugerida da partida). */
export function dataSugeridaPartida(hoje: Data, diaSemana: DiaDaSemana): Data {
  const volta = (diaDaSemana(hoje) - diaSemana + 7) % 7;
  return somarDias(hoje, -volta);
}

/** Menor data ≥ `hoje` que cai no dia da semana do grupo ("hoje incluso"). */
export function proximoDiaDeJogo(hoje: Data, diaSemana: DiaDaSemana): Data {
  const frente = (diaSemana - diaDaSemana(hoje) + 7) % 7;
  return somarDias(hoje, frente);
}
