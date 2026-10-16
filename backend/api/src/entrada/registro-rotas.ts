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
import { rotaGrupoEditar } from './rotas/grupos/editar.js';
import { rotaAdminsListar } from './rotas/grupos/admins/listar.js';
import { rotaAdminsAdicionar } from './rotas/grupos/admins/adicionar.js';
import { rotaAdminsRemover } from './rotas/grupos/admins/remover.js';
import { rotaAdminsRedefinirSenha } from './rotas/grupos/admins/redefinir-senha.js';
import { rotaAdminsFinanceiro } from './rotas/grupos/admins/financeiro.js';
import { rotaJogadoresListar } from './rotas/grupos/jogadores/listar.js';
import { rotaJogadorLer } from './rotas/grupos/jogadores/ler.js';
import { rotaJogadorCriar } from './rotas/grupos/jogadores/criar.js';
import { rotaJogadorEditar } from './rotas/grupos/jogadores/editar.js';
import { rotaJogadorInativar, rotaJogadorReativar } from './rotas/grupos/jogadores/situacao.js';
import { rotaJogadorExcluir } from './rotas/grupos/jogadores/excluir.js';
import { rotaPesosLer, rotaPesosSalvar } from './rotas/grupos/pesos/pesos.js';
import { rotaPartidasListar } from './rotas/grupos/partidas/listar.js';
import { rotaPartidaNova } from './rotas/grupos/partidas/nova.js';
import { rotaPartidaLer } from './rotas/grupos/partidas/ler.js';
import { rotaPartidaEditar, rotaPartidaExcluir, rotaPartidaSalvar } from './rotas/grupos/partidas/escrever.js';

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
  rotaGrupoEditar,
  rotaAdminsListar,
  rotaAdminsAdicionar,
  rotaAdminsRemover,
  rotaAdminsRedefinirSenha,
  rotaAdminsFinanceiro,
  rotaJogadoresListar,
  rotaJogadorLer,
  rotaJogadorCriar,
  rotaJogadorEditar,
  rotaJogadorInativar,
  rotaJogadorReativar,
  rotaJogadorExcluir,
  rotaPesosLer,
  rotaPesosSalvar,
  rotaPartidasListar,
  rotaPartidaNova,
  rotaPartidaLer,
  rotaPartidaSalvar,
  rotaPartidaEditar,
  rotaPartidaExcluir,
];
