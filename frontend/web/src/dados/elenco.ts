import { listaJogadores } from '@pelada/contrato';
import { useQuery } from '@tanstack/react-query';
import { ler } from './cliente';
import { chaveGrupo } from './grupo';

/** Chaves do elenco. Começam pela do grupo: invalidar o grupo invalida tudo daqui. */
export const chavesElenco = {
  lista: (grupoId: string) => [...chaveGrupo(grupoId), 'jogadores'] as const,
  detalhe: (grupoId: string, jogadorId: string) => [...chaveGrupo(grupoId), 'jogadores', jogadorId] as const,
};

/** Ativos e inativos juntos; o filtro Ativos/Inativos é só da tela. */
export function useJogadores(grupoId: string) {
  return useQuery({
    queryKey: chavesElenco.lista(grupoId),
    queryFn: ({ signal }) => ler(`/grupos/${encodeURIComponent(grupoId)}/jogadores`, listaJogadores, { signal }),
  });
}
