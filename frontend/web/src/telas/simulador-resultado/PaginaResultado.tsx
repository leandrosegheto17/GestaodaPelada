import { useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';
import { ErroApi } from '../../dados/erros';
import { deErroApi } from '../../dados/errosDeCampos';
import { useSugerir } from '../../dados/simulador';
import { entradaDoEstado } from '../simulador/navegacao';
import { EsqueletoResultado } from './EsqueletoResultado';
import { ResultadoDois } from './ResultadoDois';
import { ResultadoVarios } from './ResultadoVarios';

const ERRO_PADRAO = 'Não foi possível sugerir os times. Tente de novo.';

/** Rota comum à T13 e à T14: pede a sugestão e mostra o resultado do formato escolhido. */
export function Component() {
  const { grupoId = '' } = useParams();
  const { state } = useLocation();
  const entrada = useMemo(() => entradaDoEstado(state), [state]);
  const [rodada, setRodada] = useState(0);
  const sugestao = useSugerir(grupoId, entrada, rodada);
  const destino = `/admin/${encodeURIComponent(grupoId)}/simulador`;

  // Sem entrada (página recarregada ou aberta direto): volta às entradas.
  if (!entrada) return <Navigate to={destino} replace />;
  if (sugestao.isError) {
    const campos = sugestao.error instanceof ErroApi ? deErroApi(sugestao.error) : null;
    return <Navigate to={destino} replace state={{ entrada, erro: campos?.['aptos'] ?? ERRO_PADRAO }} />;
  }
  if (!sugestao.data) return <EsqueletoResultado />;

  const refazer = () => setRodada((r) => r + 1);
  if (sugestao.data.formato === 'dois_times' && entrada.formato === 'dois_times') {
    return (
      <ResultadoDois key={rodada} grupoId={grupoId} entrada={entrada} sugestao={sugestao.data} aoRefazer={refazer} />
    );
  }
  if (sugestao.data.formato === 'varios_times' && entrada.formato === 'varios_times') {
    return (
      <ResultadoVarios key={rodada} grupoId={grupoId} entrada={entrada} sugestao={sugestao.data} aoRefazer={refazer} />
    );
  }
  return null;
}
