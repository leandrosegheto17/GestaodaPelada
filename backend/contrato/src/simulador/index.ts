import type { Esquemas } from '../registro-tipos.js';
import { contextoConsulta, contextoSimulador } from './contexto.js';
import { avaliarCorpo, escalacaoConfirmada, escalacaoCorpo } from './escalacao.js';
import { entradaPrevia, entradaSimulador } from './entrada.js';
import { previaSimulador } from './previa.js';
import { avaliacaoSimulador, sugestaoSimulador } from './resultado.js';

export * from './contexto.js';
export * from './entrada.js';
export * from './escalacao.js';
export * from './previa.js';
export * from './resultado.js';

export const esquemasSimulador: Esquemas = {
  'simulador.contexto.consulta': { direcao: 'entrada', schema: contextoConsulta },
  'simulador.contexto': { direcao: 'resposta', schema: contextoSimulador },
  'simulador.previa.corpo': { direcao: 'entrada', schema: entradaPrevia },
  'simulador.previa': { direcao: 'resposta', schema: previaSimulador },
  'simulador.sugerir.corpo': { direcao: 'entrada', schema: entradaSimulador },
  'simulador.sugestao': { direcao: 'resposta', schema: sugestaoSimulador },
  'simulador.avaliar.corpo': { direcao: 'entrada', schema: avaliarCorpo },
  'simulador.avaliacao': { direcao: 'resposta', schema: avaliacaoSimulador },
  'simulador.escalacao.corpo': { direcao: 'entrada', schema: escalacaoCorpo },
  'simulador.escalacao': { direcao: 'resposta', schema: escalacaoConfirmada },
};
