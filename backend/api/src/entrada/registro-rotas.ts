import type { Hono } from 'hono';
import type { AppEnv } from './app.js';
import { rotaSessaoEntrar } from './rotas/sessao-entrar.js';
import { rotaSessaoEu } from './rotas/sessao-eu.js';
import { rotaSessaoSair } from './rotas/sessao-sair.js';

/** Todas as rotas de negócio. Cada rota nova entra aqui, depois dos middlewares do app (ADR-005). */
export const ROTAS: readonly Hono<AppEnv>[] = [rotaSessaoEntrar, rotaSessaoEu, rotaSessaoSair];
