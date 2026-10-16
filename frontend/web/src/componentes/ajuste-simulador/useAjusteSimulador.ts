import type { AvaliacaoSimulador, EntradaSimulador, SugestaoSimulador } from '@pelada/contrato';
import { useEffect, useMemo, useState } from 'react';
import { avaliarComposicao } from '../../dados/simulador';
import {
  definirSo1oTempo,
  deSugestao,
  infoDosJogadores,
  mover as moverNaComposicao,
  paraCorpoAvaliar,
  paraExibicao,
  trocar as trocarNaComposicao,
  type ComposicaoLocal,
  type Destino,
} from './composicaoLocal';

const ATRASO_MS = 300;
export const MENSAGEM_FALHA = 'Não foi possível recalcular.';

interface Entrada {
  grupoId: string;
  entrada: EntradaSimulador;
  sugestao: SugestaoSimulador;
}

type Situacao = 'ocioso' | 'pendente' | 'falhou';

/**
 * Ajuste manual da sugestão: a composição vive em memória, cada ajuste aparece na hora e pede `avaliar`
 * (com atraso de 300 ms, cancelando o pedido anterior). Só a resposta do último pedido é aplicada. A falha
 * mantém a composição. Uma sugestão nova descarta os ajustes e o destaque "movido".
 */
export function useAjusteSimulador({ grupoId, entrada, sugestao }: Entrada) {
  const [base, setBase] = useState(sugestao);
  const [composicao, setComposicao] = useState<ComposicaoLocal>(() => deSugestao(sugestao, entrada));
  const [ultima, setUltima] = useState<AvaliacaoSimulador>(sugestao);
  const [movidos, setMovidos] = useState<ReadonlySet<string>>(new Set());
  const [situacao, setSituacao] = useState<Situacao>('ocioso');
  const [houveAjuste, setHouveAjuste] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  if (base !== sugestao) {
    setBase(sugestao);
    setComposicao(deSugestao(sugestao, entrada));
    setUltima(sugestao);
    setMovidos(new Set());
    setSituacao('ocioso');
    setHouveAjuste(false);
  }

  const info = useMemo(() => infoDosJogadores(sugestao), [sugestao]);
  const corpo = useMemo(() => paraCorpoAvaliar(entrada, composicao), [entrada, composicao]);

  useEffect(() => {
    if (!houveAjuste || !corpo) return;
    setSituacao('pendente');
    const controle = new AbortController();
    const timer = setTimeout(() => {
      avaliarComposicao(grupoId, corpo, controle.signal).then(
        (resposta) => {
          setUltima(resposta);
          setSituacao('ocioso');
        },
        () => {
          if (!controle.signal.aborted) setSituacao('falhou');
        },
      );
    }, ATRASO_MS);
    return () => {
      clearTimeout(timer);
      controle.abort();
    };
  }, [grupoId, corpo, houveAjuste, tentativa]);

  const ajustar = (nova: ComposicaoLocal, id: string[]) => {
    setComposicao(nova);
    setHouveAjuste(true);
    setMovidos((atual) => new Set([...atual, ...id]));
  };

  return {
    exibicao: useMemo(() => paraExibicao(composicao, info, ultima, entrada.n), [composicao, info, ultima, entrada.n]),
    composicao,
    movidos,
    houveAjuste,
    recalculando: situacao === 'pendente',
    erroRecalculo: situacao === 'falhou' ? MENSAGEM_FALHA : null,
    /** Confirmar só vale com os números em dia: sem pedido pendente e sem falha. */
    podeConfirmar: situacao === 'ocioso',
    tentarDeNovo: () => setTentativa((n) => n + 1),
    mover: (id: string, destino: Destino) => ajustar(moverNaComposicao(composicao, id, destino), [id]),
    trocar: (a: string, b: string) => ajustar(trocarNaComposicao(composicao, a, b), [a, b]),
    definirSo1oTempo: (id: string, valor: boolean) => {
      setComposicao(definirSo1oTempo(composicao, id, valor));
      setHouveAjuste(true);
    },
  };
}
