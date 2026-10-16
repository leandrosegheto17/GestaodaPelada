import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { roteador } from './rotas';

const clienteDeConsultas = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <RouterProvider router={roteador} />
    </QueryClientProvider>
  );
}
