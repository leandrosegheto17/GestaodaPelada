import {
  inicioEditarResposta,
  inicioPreviaResposta,
  jogadorDetalhe,
  listaJogadores,
  periodosResposta,
  type PeriodosResposta,
} from '@pelada/contrato';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { escrever, ler, semCorpo } from './cliente';
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

export const caminhoJogador = (grupoId: string, jogadorId: string) =>
  `/grupos/${encodeURIComponent(grupoId)}/jogadores/${encodeURIComponent(jogadorId)}`;

/** Ficha do jogador (dados, situação, nível e notas). Sempre busca de novo ao abrir. */
export function useJogador(grupoId: string, jogadorId: string, habilitado = true) {
  return useQuery({
    queryKey: chavesElenco.detalhe(grupoId, jogadorId),
    queryFn: ({ signal }) => ler(caminhoJogador(grupoId, jogadorId), jogadorDetalhe, { signal }),
    enabled: habilitado,
    staleTime: 0,
  });
}

export type PeriodoDoJogador = PeriodosResposta['periodos'][number];

/** Períodos de atividade do jogador; sob a chave da ficha, então invalidar o grupo os refaz. */
export function usePeriodos(grupoId: string, jogadorId: string) {
  return useQuery({
    queryKey: [...chavesElenco.detalhe(grupoId, jogadorId), 'periodos'] as const,
    queryFn: ({ signal }) => ler(`${caminhoJogador(grupoId, jogadorId)}/periodos`, periodosResposta, { signal }),
    staleTime: 0,
  });
}

export interface CorpoJogador {
  apelido: string;
  anoNascimento: number;
  posicao: string;
  telefone: string | null;
  pontuacaoInicial: number;
  dataEntrada?: string | undefined;
}

/** Mudanças no elenco invalidam o grupo inteiro (lista, início com `jogadoresAtivos`, ranking de notas). */
export function useInvalidarGrupo(grupoId: string) {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: chaveGrupo(grupoId) });
}

export function useCriarJogador(grupoId: string) {
  const invalidar = useInvalidarGrupo(grupoId);
  return useMutation({
    mutationFn: (corpo: CorpoJogador) =>
      escrever('POST', `/grupos/${encodeURIComponent(grupoId)}/jogadores`, corpo, jogadorDetalhe),
    onSuccess: invalidar,
  });
}

export function useEditarJogador(grupoId: string, jogadorId: string) {
  const invalidar = useInvalidarGrupo(grupoId);
  return useMutation({
    mutationFn: (corpo: CorpoJogador) => escrever('PATCH', caminhoJogador(grupoId, jogadorId), corpo, jogadorDetalhe),
    onSuccess: invalidar,
  });
}

/** Efeito de trocar a data de início (acumulado, posição, rodadas), sem gravar; o cálculo é da API. */
export function useInicioPrevia(grupoId: string, jogadorId: string) {
  return useMutation({
    mutationFn: (corpo: { data: string }) =>
      escrever('POST', `${caminhoJogador(grupoId, jogadorId)}/inicio/previa`, corpo, inicioPreviaResposta),
  });
}

export function useAlterarInicio(grupoId: string, jogadorId: string) {
  const invalidar = useInvalidarGrupo(grupoId);
  return useMutation({
    mutationFn: (corpo: { data: string }) =>
      escrever('PUT', `${caminhoJogador(grupoId, jogadorId)}/inicio`, corpo, inicioEditarResposta),
    onSuccess: invalidar,
  });
}

export function useInativarJogador(grupoId: string, jogadorId: string) {
  const invalidar = useInvalidarGrupo(grupoId);
  return useMutation({
    mutationFn: (corpo: { dataSaida?: string }) =>
      escrever('POST', `${caminhoJogador(grupoId, jogadorId)}/inativar`, corpo, semCorpo),
    onSuccess: invalidar,
  });
}

export function useReativarJogador(grupoId: string, jogadorId: string) {
  const invalidar = useInvalidarGrupo(grupoId);
  return useMutation({
    mutationFn: (corpo: { dataRetorno?: string }) =>
      escrever('POST', `${caminhoJogador(grupoId, jogadorId)}/reativar`, corpo, semCorpo),
    onSuccess: invalidar,
  });
}

export function useExcluirJogador(grupoId: string, jogadorId: string) {
  const invalidar = useInvalidarGrupo(grupoId);
  return useMutation({
    mutationFn: () => escrever('DELETE', caminhoJogador(grupoId, jogadorId), undefined, semCorpo),
    onSuccess: invalidar,
  });
}
