import type { EntradaSimulador } from '@pelada/contrato';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { type ComposicaoLocal, paraCorpoEscalacao } from '../../componentes/ajuste-simulador';
import { estadoRetorno } from '../../dados/retorno';
import { useConfirmarEscalacao } from '../../dados/simulador';

export const MENSAGEM_FALHA_CONFIRMAR = 'Não foi possível confirmar a escalação. Tente de novo.';

interface Params {
  grupoId: string;
  entrada: EntradaSimulador;
  composicao: ComposicaoLocal;
}

/** Confirma a escalação ajustada e volta ao painel do grupo; expõe se a confirmação falhou. */
export function useConfirmacaoEscalacao({ grupoId, entrada, composicao }: Params) {
  const navegar = useNavigate();
  const confirmar = useConfirmarEscalacao(grupoId);
  const [falhouAoConfirmar, setFalhouAoConfirmar] = useState(false);

  const aoConfirmar = () => {
    const corpo = paraCorpoEscalacao(entrada, composicao);
    if (!corpo) {
      setFalhouAoConfirmar(true);
      return;
    }
    setFalhouAoConfirmar(false);
    confirmar.mutate(corpo, {
      onSuccess: () =>
        void navegar(`/admin/${encodeURIComponent(grupoId)}`, {
          state: estadoRetorno({ tipo: 'escalacao-confirmada', data: entrada.data }),
        }),
      onError: () => setFalhouAoConfirmar(true),
    });
  };

  return { aoConfirmar, confirmando: confirmar.isPending, falhouAoConfirmar };
}
