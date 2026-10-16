import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { criarClienteConsultas } from '../dados/consultas';
import { destinoDeEntrada } from '../dados/destino';
import { FaixaNovaVersao } from '../pwa/FaixaNovaVersao';
import { roteador } from './rotas';

const clienteDeConsultas = criarClienteConsultas({
  aoNaoAutenticado: () => {
    const destino = destinoDeEntrada(location.pathname, location.search);
    if (destino) void roteador.navigate(destino, { replace: true });
  },
});

export function App() {
  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <FaixaNovaVersao />
      <RouterProvider router={roteador} />
    </QueryClientProvider>
  );
}
