import type { TabelasAcesso } from './tipos/acesso.js';
import type { TabelasElenco } from './tipos/elenco.js';
import type { TabelasGrupos } from './tipos/grupos.js';
import type { TabelasPartidas } from './tipos/partidas.js';
import type { TabelasUso } from './tipos/uso.js';

/**
 * Tabelas conhecidas pelo Kysely, por contexto. Uso interno do módulo de dados:
 * cada migração nova acrescenta o seu contexto aqui.
 */
export interface TabelasBanco extends TabelasAcesso, TabelasGrupos, TabelasElenco, TabelasPartidas, TabelasUso {}
