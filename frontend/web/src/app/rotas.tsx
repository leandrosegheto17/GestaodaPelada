import { createBrowserRouter } from 'react-router';
import { LayoutAdmin } from '../componentes/layout-admin';
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
      { path: '/conta/senha', lazy: () => import('../telas/minha-senha/MinhaSenha') },
      { path: '/entrar/nova-senha', lazy: () => import('../telas/nova-senha/NovaSenha') },
      { path: '/admin/:grupoId', Component: LayoutAdmin, children: [] },
    ],
  },
]);
