import { notaSalva, type JogadorDetalhe, type NotaSalva } from '@pelada/contrato';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { escrever } from './cliente';
import { chavesElenco } from './elenco';
import { chaveSimulador } from './simulador';

interface Pedido {
  habilidadeId: string;
  /** `null` apaga a nota. */
  nota: number | null;
}

/**
 * Grava uma nota e atualiza a ficha em cache com a resposta. Se a resposta de um pedido antigo chega depois
 * da de um mais novo, ela não sobrescreve nada: vale o último pedido de cada habilidade e, para o nível, o
 * último pedido de todos.
 */
export function useSalvarNota(grupoId: string, jogadorId: string) {
  const cliente = useQueryClient();
  const ordem = useRef({ geral: 0, porHabilidade: new Map<string, number>() });

  return useMutation({
    mutationFn: async ({ habilidadeId, nota }: Pedido) => {
      const minha = ++ordem.current.geral;
      ordem.current.porHabilidade.set(habilidadeId, minha);
      const salva = await escrever(
        'PUT',
        `/grupos/${encodeURIComponent(grupoId)}/jogadores/${encodeURIComponent(jogadorId)}/notas/${encodeURIComponent(habilidadeId)}`,
        { nota },
        notaSalva,
      );
      return { salva, minha };
    },
    onSuccess: async ({ salva, minha }) => {
      const ultimaDaHabilidade = ordem.current.porHabilidade.get(salva.habilidadeId) === minha;
      const ultimaDeTodas = ordem.current.geral === minha;
      cliente.setQueryData<JogadorDetalhe>(chavesElenco.detalhe(grupoId, jogadorId), (ficha) =>
        ficha ? aplicar(ficha, salva, ultimaDaHabilidade, ultimaDeTodas) : ficha,
      );
      await Promise.all([
        cliente.invalidateQueries({ queryKey: chavesElenco.lista(grupoId), exact: true }),
        cliente.invalidateQueries({ queryKey: chaveSimulador(grupoId) }),
      ]);
    },
  });
}

function aplicar(ficha: JogadorDetalhe, salva: NotaSalva, daHabilidade: boolean, deTodas: boolean): JogadorDetalhe {
  return {
    ...ficha,
    ...(deTodas ? { nivel: salva.nivel, semNota: salva.semNota } : {}),
    notas: daHabilidade
      ? ficha.notas.map((n) => (n.habilidadeId === salva.habilidadeId ? { ...n, nota: salva.nota } : n))
      : ficha.notas,
  };
}
