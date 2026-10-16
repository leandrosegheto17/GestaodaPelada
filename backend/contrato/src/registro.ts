import { erroPadrao } from './erro.js';
import type { Esquemas } from './registro-tipos.js';
import { esquemasAdmins } from './admins.js';
import { esquemasDono } from './dono.js';
import { esquemasElenco } from './elenco.js';
import { esquemasGrupo } from './grupo.js';
import { esquemasHabilidades } from './habilidades.js';
import { esquemasPartidas } from './partidas.js';
import { esquemasPdf } from './pdf.js';
import { esquemasPesos } from './pesos.js';
import { esquemasPublico } from './publico.js';
import { esquemasSessao } from './sessao.js';
import { esquemasSimulador } from './simulador/index.js';
import { esquemasUso } from './uso.js';

export type { EsquemaRegistrado, Esquemas } from './registro-tipos.js';

/**
 * Todo schema publicado pelo contrato, por nome. Cada contexto exporta o seu objeto de esquemas
 * e entra aqui numa linha. O snapshot e a checagem de compatibilidade leem este registro.
 */
export const REGISTRO: Esquemas = {
  erro: { direcao: 'resposta', schema: erroPadrao },
  ...esquemasAdmins,
  ...esquemasDono,
  ...esquemasElenco,
  ...esquemasGrupo,
  ...esquemasHabilidades,
  ...esquemasPartidas,
  ...esquemasPdf,
  ...esquemasPesos,
  ...esquemasPublico,
  ...esquemasSessao,
  ...esquemasSimulador,
  ...esquemasUso,
};
