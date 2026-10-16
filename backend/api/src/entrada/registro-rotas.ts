import type { Hono } from 'hono';
import type { AppEnv } from './app.js';
import { rotaDonoCriarGrupo } from './rotas/dono/criar-grupo.js';
import { rotaDonoGrupo } from './rotas/dono/grupo.js';
import { rotaDonoPainel } from './rotas/dono/painel.js';
import { rotaSessaoEntrar } from './rotas/sessao-entrar.js';
import { rotaSessaoEsqueciSenha } from './rotas/sessao-esqueci-senha.js';
import { rotaSessaoEu } from './rotas/sessao-eu.js';
import { rotaSessaoTrocarSenha } from './rotas/sessao-trocar-senha.js';
import { rotaSessaoSair } from './rotas/sessao-sair.js';
import { rotaDonoSituacao } from './rotas/dono/situacao.js';
import { rotaDonoArquivar, rotaDonoReativar } from './rotas/dono/arquivamento.js';
import { rotaDonoResolverPedido } from './rotas/dono/pedidos-reset.js';
import { rotaDonoRedefinirSenha } from './rotas/dono/redefinir-senha.js';
import { rotaGrupoLer } from './rotas/grupos/ler.js';

/** Todas as rotas de negócio. Cada rota nova entra aqui, depois dos middlewares do app (ADR-005). */
export const ROTAS: readonly Hono<AppEnv>[] = [
  rotaSessaoEntrar,
  rotaSessaoEsqueciSenha,
  rotaSessaoEu,
  rotaSessaoSair,
  rotaSessaoTrocarSenha,
  rotaDonoPainel,
  rotaDonoGrupo,
  rotaDonoCriarGrupo,
  rotaDonoSituacao,
  rotaDonoArquivar,
  rotaDonoReativar,
  rotaDonoResolverPedido,
  rotaDonoRedefinirSenha,
  rotaGrupoLer,
];
