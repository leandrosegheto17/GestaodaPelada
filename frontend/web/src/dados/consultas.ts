import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ErroApi, ehErroDeRede } from './erros';

interface Opcoes {
  aoNaoAutenticado: () => void;
}

/** Retry só para falha de rede (1x); erros da API e respostas inválidas não melhoram repetindo. */
export function criarClienteConsultas({ aoNaoAutenticado }: Opcoes): QueryClient {
  const aoErrar = (erro: unknown) => {
    if (erro instanceof ErroApi && erro.status === 401) aoNaoAutenticado();
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError: aoErrar }),
    mutationCache: new MutationCache({ onError: aoErrar }),
    defaultOptions: {
      queries: { retry: (tentativas, erro) => ehErroDeRede(erro) && tentativas < 1, retryDelay: 500 },
      mutations: { retry: false },
    },
  });
}
