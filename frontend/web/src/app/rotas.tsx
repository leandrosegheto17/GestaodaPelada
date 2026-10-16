import { createBrowserRouter } from 'react-router';
import { LayoutAdmin } from '../componentes/layout-admin';
import { RotaProtegida } from './guarda/RotaProtegida';

/** Uma rota por tela, com divisão de código (import literal por rota). */
export const roteador = createBrowserRouter([
  { path: '/', lazy: () => import('../telas/inicial/Inicial') },
  // Áreas com login (/admin, /conta, /dono, /entrar/nova-senha): as telas entram aqui como filhas.
  {
    Component: RotaProtegida,
    children: [{ path: '/admin/:grupoId', Component: LayoutAdmin, children: [] }],
  },
]);
