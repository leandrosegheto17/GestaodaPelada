import type { Hono } from 'hono';
import type { AppEnv } from './app.js';
import { rotaSessaoEntrar } from './rotas/sessao-entrar.js';

/** Todas as rotas de negócio. Cada rota nova entra aqui, depois dos middlewares do app (ADR-005). */
export const ROTAS: readonly Hono<AppEnv>[] = [rotaSessaoEntrar];
