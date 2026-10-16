import type { TabelasAcesso } from './tipos/acesso.js';
import type { TabelasElenco } from './tipos/elenco.js';
import type { TabelasGrupos } from './tipos/grupos.js';
import type { TabelasPartidas } from './tipos/partidas.js';

export interface TabelasBanco extends TabelasAcesso, TabelasGrupos, TabelasElenco, TabelasPartidas {}
