import { createBrowserRouter } from 'react-router';

/** Uma rota por tela, com divisão de código (import literal por rota). */
export const roteador = createBrowserRouter([{ path: '/', lazy: () => import('../telas/inicial/Inicial') }]);
