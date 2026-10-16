import type { TabelasAcesso } from './tipos/acesso.js';
import type { TabelasGrupos } from './tipos/grupos.js';

/**
 * Tabelas conhecidas pelo Kysely, por contexto. Uso interno do módulo de dados:
 * cada migração nova acrescenta o seu contexto aqui.
 */
export interface TabelasBanco extends TabelasAcesso, TabelasGrupos {}
