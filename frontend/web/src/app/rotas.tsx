import { createBrowserRouter } from 'react-router';
import { LayoutAdmin } from '../componentes/layout-admin';
import { LayoutDono } from '../componentes/layout-dono/LayoutDono';
import { carregarEntrada } from '../telas/entrada/carregarEntrada';
import { RotaProtegida } from './guarda/RotaProtegida';

/** Enquanto o loader decide (grupo lembrado), não pisca nenhuma tela. */
const SemFallback = () => null;

/** Uma rota por tela, com divisão de código (import literal por rota). */
export const roteador = createBrowserRouter([
  {
    path: '/',
    loader: carregarEntrada,
    HydrateFallback: SemFallback,
    lazy: () => import('../telas/sem-grupo/SemGrupo'),
  },
  { path: '/entrar', lazy: () => import('../telas/entrar/Entrar') },
  { path: '/entrar/esqueci', lazy: () => import('../telas/esqueci/EsqueciSenha') },
  { path: '/g/:slug', lazy: () => import('../telas/ranking/PaginaRanking') },
  // Áreas com login (/admin, /conta, /dono, /entrar/nova-senha): as telas entram aqui como filhas.
  {
    Component: RotaProtegida,
    children: [
      {
        path: '/dono',
        Component: LayoutDono,
        children: [
          { index: true, lazy: () => import('../telas/dono/AreaDono') },
          { path: 'grupos/novo', lazy: () => import('../telas/dono/NovoGrupo') },
          { path: 'grupos/:grupoId', lazy: () => import('../telas/dono/GrupoDono') },
        ],
      },
      { path: '/admin', lazy: () => import('../telas/grupos/EscolherGrupo') },
      { path: '/conta/senha', lazy: () => import('../telas/minha-senha/MinhaSenha') },
      { path: '/entrar/nova-senha', lazy: () => import('../telas/nova-senha/NovaSenha') },
      {
        path: '/admin/:grupoId',
        Component: LayoutAdmin,
        children: [
          { index: true, lazy: () => import('../telas/inicio/PaginaInicio') },
          { path: 'uso', lazy: () => import('../telas/uso/PaginaUso') },
          { path: 'grupo', lazy: () => import('../telas/grupo/PaginaGrupo') },
          { path: 'admins', lazy: () => import('../telas/admins/PaginaAdmins') },
          { path: 'pontuacao', lazy: () => import('../telas/pontuacao/PaginaPontuacao') },
          { path: 'jogadores/novo', lazy: () => import('../telas/jogador/PaginaJogador') },
          { path: 'jogadores/:jogadorId', lazy: () => import('../telas/jogador/PaginaJogador') },
          { path: 'jogadores', lazy: () => import('../telas/jogadores/PaginaJogadores') },
          { path: 'partidas/nova', lazy: () => import('../telas/partida/PaginaNovaPartida') },
          { path: 'partidas/:data', lazy: () => import('../telas/partida/PaginaEditarPartida') },
          { path: 'partidas', lazy: () => import('../telas/partidas/PaginaPartidas') },
        ],
      },
    ],
  },
]);
